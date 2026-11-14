// README (ronda 83) · Para que terminen su invitación:
//   1. «Guardar mi invitación» en el panel: dejan un mail (y, si quieren, aceptan recibir novedades) y les llega
//      el link para volver desde cualquier dispositivo. Queda en app_state['contacto:<evento>'].
//   2. Recordatorios automáticos a los borradores con mail (se prenden en la consola → Invitaciones):
//      el primero sin cupón (¿les ayudamos?) y, días después, el segundo con el cupón elegido.
//   3. El aviso de ayuda al volver al panel está en public/panel/panel.js (ayudaAlVolver).
// Los mails van en el idioma del cliente (es, en, pt, fr, it, de, nl) y siempre con el link de baja.
import { plantilla, sendEmail } from './lib/email.js';
import { hmacHex, isEmail, str, HttpError } from './lib/util.js';
import { getState, setState } from './lib/verifactu.js';
import { fechaEvento } from './vencimiento.js';

const nombresDe = (d = {}) => [d.nombres?.a, d.nombres?.b].filter(Boolean).join(' & ');
const sitio = (env) => String(env.SITE_URL || 'https://amoinvitar.com').replace(/\/$/, '');
const secreto = (env) => env.SECRETO_ACCESO || 'solo-para-pruebas-locales';
const DIA = 86400000;

// Textos de los mails por idioma. {n} = nombres de la invitación · {d} = días del cupón
const T = {
  es: {
    fijos: { botonNo: 'Si el botón no funciona, copiar este link en el navegador:', firma: 'El equipo de Amo Invitar!', baja: 'Si no se quieren recibir más mails como este:', bajaLink: 'darse de baja', bajaTexto: 'Para no recibir más mails como este:' },
    guardado: { asunto: 'La invitación {n} quedó guardada', titulo: '¡Invitación guardada!', lineas: ['Todo lo cargado en la invitación de {n} queda guardado.', 'Con este botón se vuelve a la invitación cuando se quiera, desde cualquier celular o computadora, y se sigue desde donde quedó.'], boton: 'Volver a mi invitación' },
    r1: { asunto: '¿Seguimos con la invitación {n}?', titulo: 'La invitación los espera', lineas: ['La invitación de {n} quedó a medio armar. Todo lo cargado está guardado: se sigue desde donde quedó.', '¿Alguna duda con el diseño, los textos o las fotos? Nos pueden escribir y les ayudamos a terminarla.'], boton: 'Seguir con mi invitación' },
    r2: { asunto: 'Un regalo para terminar la invitación {n}', titulo: '¡Falta muy poco!', lineas: ['Para ayudarles a terminar la invitación de {n}, les dejamos un descuento especial.', 'Se usa al pagar, escribiendo el código.'], boton: 'Terminar mi invitación', rotulo: 'Código de descuento', nota: 'Válido por {d} días' },
    whatsapp: 'Escribirnos por WhatsApp', pie: '¿Dudas? Se puede responder este mail o',
  },
  en: {
    fijos: { botonNo: 'If the button doesn’t work, copy this link into your browser:', firma: 'The Amo Invitar! team', baja: 'Don’t want to receive emails like this?', bajaLink: 'Unsubscribe', bajaTexto: 'To stop receiving emails like this:' },
    guardado: { asunto: 'Your invitation {n} is saved', titulo: 'Invitation saved!', lineas: ['Everything you added to the invitation for {n} is saved.', 'Use this button to come back whenever you like, from any phone or computer, and pick up where you left off.'], boton: 'Back to my invitation' },
    r1: { asunto: 'Shall we finish the invitation {n}?', titulo: 'Your invitation is waiting', lineas: ['The invitation for {n} is half done. Everything is saved: you can pick up where you left off.', 'Any questions about the design, texts or photos? Write to us and we’ll help you finish it.'], boton: 'Continue my invitation' },
    r2: { asunto: 'A gift to finish the invitation {n}', titulo: 'Almost there!', lineas: ['To help you finish the invitation for {n}, here is a special discount.', 'Just enter the code when you pay.'], boton: 'Finish my invitation', rotulo: 'Discount code', nota: 'Valid for {d} days' },
    whatsapp: 'message us on WhatsApp', pie: 'Questions? Reply to this email or',
  },
  pt: {
    fijos: { botonNo: 'Se o botão não funcionar, copie este link no navegador:', firma: 'A equipe Amo Invitar!', baja: 'Não quer receber mais e-mails como este?', bajaLink: 'Cancelar inscrição', bajaTexto: 'Para não receber mais e-mails como este:' },
    guardado: { asunto: 'O convite {n} foi salvo', titulo: 'Convite salvo!', lineas: ['Tudo o que você colocou no convite de {n} está salvo.', 'Com este botão você volta ao convite quando quiser, de qualquer celular ou computador, e continua de onde parou.'], boton: 'Voltar ao meu convite' },
    r1: { asunto: 'Vamos terminar o convite {n}?', titulo: 'Seu convite está esperando', lineas: ['O convite de {n} ficou pela metade. Tudo está salvo: é só continuar de onde parou.', 'Alguma dúvida com o design, os textos ou as fotos? Fale com a gente e ajudamos você a terminar.'], boton: 'Continuar meu convite' },
    r2: { asunto: 'Um presente para terminar o convite {n}', titulo: 'Falta muito pouco!', lineas: ['Para ajudar você a terminar o convite de {n}, deixamos um desconto especial.', 'É só usar o código na hora de pagar.'], boton: 'Terminar meu convite', rotulo: 'Código de desconto', nota: 'Válido por {d} dias' },
    whatsapp: 'falar pelo WhatsApp', pie: 'Dúvidas? Responda este e-mail ou',
  },
  fr: {
    fijos: { botonNo: 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :', firma: 'L’équipe Amo Invitar!', baja: 'Vous ne souhaitez plus recevoir ce type d’e-mails ?', bajaLink: 'Se désabonner', bajaTexto: 'Pour ne plus recevoir ce type d’e-mails :' },
    guardado: { asunto: 'L’invitation {n} est enregistrée', titulo: 'Invitation enregistrée !', lineas: ['Tout ce que vous avez ajouté à l’invitation de {n} est enregistré.', 'Avec ce bouton, vous revenez à l’invitation quand vous voulez, depuis n’importe quel téléphone ou ordinateur, et vous reprenez là où vous en étiez.'], boton: 'Revenir à mon invitation' },
    r1: { asunto: 'On termine l’invitation {n} ?', titulo: 'Votre invitation vous attend', lineas: ['L’invitation de {n} est à moitié prête. Tout est enregistré : vous reprenez là où vous en étiez.', 'Une question sur le design, les textes ou les photos ? Écrivez-nous et nous vous aiderons à la terminer.'], boton: 'Continuer mon invitation' },
    r2: { asunto: 'Un cadeau pour terminer l’invitation {n}', titulo: 'Plus qu’un petit effort !', lineas: ['Pour vous aider à terminer l’invitation de {n}, voici une réduction spéciale.', 'Il suffit de saisir le code au moment du paiement.'], boton: 'Terminer mon invitation', rotulo: 'Code de réduction', nota: 'Valable {d} jours' },
    whatsapp: 'nous écrire sur WhatsApp', pie: 'Des questions ? Répondez à cet e-mail ou',
  },
  it: {
    fijos: { botonNo: 'Se il pulsante non funziona, copia questo link nel browser:', firma: 'Il team di Amo Invitar!', baja: 'Non vuoi più ricevere email come questa?', bajaLink: 'Annulla iscrizione', bajaTexto: 'Per non ricevere più email come questa:' },
    guardado: { asunto: 'L’invito {n} è salvato', titulo: 'Invito salvato!', lineas: ['Tutto quello che hai inserito nell’invito di {n} è salvato.', 'Con questo pulsante torni all’invito quando vuoi, da qualsiasi telefono o computer, e riprendi da dove eri rimasto.'], boton: 'Torna al mio invito' },
    r1: { asunto: 'Finiamo l’invito {n}?', titulo: 'Il tuo invito ti aspetta', lineas: ['L’invito di {n} è a metà. È tutto salvato: riprendi da dove eri rimasto.', 'Dubbi sul design, i testi o le foto? Scrivici e ti aiutiamo a finirlo.'], boton: 'Continua il mio invito' },
    r2: { asunto: 'Un regalo per finire l’invito {n}', titulo: 'Manca pochissimo!', lineas: ['Per aiutarti a finire l’invito di {n}, ecco uno sconto speciale.', 'Basta inserire il codice al momento del pagamento.'], boton: 'Finisci il mio invito', rotulo: 'Codice sconto', nota: 'Valido per {d} giorni' },
    whatsapp: 'scriverci su WhatsApp', pie: 'Domande? Rispondi a questa email o',
  },
  de: {
    fijos: { botonNo: 'Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:', firma: 'Dein Amo Invitar! Team', baja: 'Du möchtest solche E-Mails nicht mehr erhalten?', bajaLink: 'Abmelden', bajaTexto: 'Um solche E-Mails nicht mehr zu erhalten:' },
    guardado: { asunto: 'Die Einladung {n} ist gespeichert', titulo: 'Einladung gespeichert!', lineas: ['Alles, was du in der Einladung von {n} eingetragen hast, ist gespeichert.', 'Mit diesem Button kommst du jederzeit zurück, von jedem Handy oder Computer, und machst dort weiter, wo du aufgehört hast.'], boton: 'Zurück zu meiner Einladung' },
    r1: { asunto: 'Machen wir die Einladung {n} fertig?', titulo: 'Deine Einladung wartet', lineas: ['Die Einladung von {n} ist halb fertig. Alles ist gespeichert: Du machst dort weiter, wo du aufgehört hast.', 'Fragen zum Design, zu den Texten oder Fotos? Schreib uns und wir helfen dir.'], boton: 'Einladung fortsetzen' },
    r2: { asunto: 'Ein Geschenk, um die Einladung {n} fertigzustellen', titulo: 'Fast geschafft!', lineas: ['Damit du die Einladung von {n} fertigstellen kannst, schenken wir dir einen Rabatt.', 'Gib den Code einfach beim Bezahlen ein.'], boton: 'Einladung fertigstellen', rotulo: 'Rabattcode', nota: '{d} Tage gültig' },
    whatsapp: 'schreib uns auf WhatsApp', pie: 'Fragen? Antworte auf diese E-Mail oder',
  },
  nl: {
    fijos: { botonNo: 'Werkt de knop niet? Kopieer deze link in je browser:', firma: 'Het Amo Invitar! team', baja: 'Wil je zulke e-mails niet meer ontvangen?', bajaLink: 'Afmelden', bajaTexto: 'Om zulke e-mails niet meer te ontvangen:' },
    guardado: { asunto: 'De uitnodiging {n} is opgeslagen', titulo: 'Uitnodiging opgeslagen!', lineas: ['Alles wat je in de uitnodiging van {n} hebt ingevuld, is opgeslagen.', 'Met deze knop ga je terug wanneer je wilt, vanaf elke telefoon of computer, en ga je verder waar je gebleven was.'], boton: 'Terug naar mijn uitnodiging' },
    r1: { asunto: 'Maken we de uitnodiging {n} af?', titulo: 'Je uitnodiging wacht op je', lineas: ['De uitnodiging van {n} is half klaar. Alles is opgeslagen: je gaat verder waar je gebleven was.', 'Vragen over het ontwerp, de teksten of de foto’s? Stuur ons een bericht en we helpen je.'], boton: 'Verder met mijn uitnodiging' },
    r2: { asunto: 'Een cadeautje om de uitnodiging {n} af te maken', titulo: 'Bijna klaar!', lineas: ['Om je te helpen de uitnodiging van {n} af te maken, krijg je een speciale korting.', 'Vul de code gewoon in bij het betalen.'], boton: 'Mijn uitnodiging afmaken', rotulo: 'Kortingscode', nota: '{d} dagen geldig' },
    whatsapp: 'stuur ons een WhatsApp', pie: 'Vragen? Beantwoord deze e-mail of',
  },
};
export const idiomaMail = (x) => { const l = String(x || '').slice(0, 2).toLowerCase(); return T[l] ? l : 'es'; };

export async function linkBaja(env, email) {
  return `${sitio(env)}/baja?e=${encodeURIComponent(email)}&t=${await hmacHex(secreto(env), `baja:${String(email).toLowerCase()}`)}`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function armar(env, idioma, clave, { nombres, url, cupon, dias, baja }) {
  const L = T[idioma], m = L[clave];
  const poner = (x) => String(x).replaceAll('{n}', nombres || '').replaceAll('{d}', dias || '');
  const wa = String(env.WHATSAPP || '').replace(/\D/g, '');
  return {
    subject: poner(m.asunto).replace(/\s+\?/, ' ?').replace(/\s{2,}/g, ' ').trim(),
    ...plantilla(env, {
      titulo: poner(m.titulo), lineas: m.lineas.map((l) => esc(poner(l))), boton: m.boton, url, baja, fijos: L.fijos,
      destacado: cupon ? { rotulo: m.rotulo, codigo: cupon, nota: dias ? poner(m.nota) : '' } : null,
      pie: clave === 'guardado' ? null : `${esc(L.pie)} ${wa ? `<a href="https://wa.me/${wa}">${esc(L.whatsapp)}</a>` : 'hola@amoinvitar.com'}.`,
    }),
  };
}

// 1 · «Guardar mi invitación»: el mail que deja en el panel, con el link para volver
export async function guardarContacto(env, ev, b) {
  const email = str(b.email, 200).trim().toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'El mail no parece válido');
  const idioma = idiomaMail(b.idioma);
  const contacto = { email, promos: b.promos === true, idioma, fecha: new Date().toISOString() };
  await setState(env, `contacto:${ev.id}`, JSON.stringify(contacto));
  const url = `${sitio(env)}/panel/${ev.id}?k=${ev.clave}`;
  await sendEmail(env, { to: email, ...armar(env, idioma, 'guardado', { nombres: nombresDe(ev.datos), url }) });
  return contacto;
}
export async function contactoDe(env, id) {
  try { return JSON.parse((await getState(env, `contacto:${id}`)) || 'null'); } catch { return null; }
}

// 2 · Recordatorios automáticos (tarea diaria). Configuración en app_state['auto_borradores']
export const AUTO_DEFECTO = { activo: false, dias1: 1, dias2: 6, cupon: '', diasCupon: 7 };
export async function configAuto(env) {
  try { return { ...AUTO_DEFECTO, ...JSON.parse((await getState(env, 'auto_borradores')) || '{}') }; } catch { return { ...AUTO_DEFECTO }; }
}
export async function guardarConfigAuto(env, b) {
  const n = (x, min, max, d) => Math.min(max, Math.max(min, parseInt(x, 10) || d));
  const c = { activo: b.activo === true, dias1: n(b.dias1, 1, 30, 1), dias2: n(b.dias2, 2, 60, 6), cupon: str(b.cupon, 40).toUpperCase(), diasCupon: n(b.diasCupon, 1, 60, 7) };
  if (c.dias2 <= c.dias1) c.dias2 = c.dias1 + 1;
  if (c.cupon && !(await env.DB.prepare('SELECT 1 FROM cupones WHERE codigo = ? AND activo = 1').bind(c.cupon).first())) throw new HttpError(400, `No existe un cupón activo «${c.cupon}». Se crea en la pestaña Cupones.`);
  await setState(env, 'auto_borradores', JSON.stringify(c));
  return c;
}

export async function recordatoriosBorradores(env, { ahora = Date.now(), tope = 100 } = {}) {
  const cfg = await configAuto(env);
  if (!cfg.activo) return { enviados: 0, apagado: true };
  // Solo borradores con movimiento en los últimos 30 días (no se escribe a los viejos al prenderlo)
  const desde = new Date(ahora - 30 * DIA).toISOString();
  const { results = [] } = await env.DB.prepare(`SELECT e.id, e.datos, e.clave_panel, e.actualizado,
      (SELECT value FROM app_state WHERE key = 'ingreso:' || e.id) AS ingreso,
      (SELECT value FROM app_state WHERE key = 'contacto:' || e.id) AS contacto,
      (SELECT value FROM app_state WHERE key = 'mailborrador:' || e.id) AS mails,
      (SELECT u.email FROM accesos_evento a JOIN usuarios u ON u.id = a.usuario_id WHERE a.evento_id = e.id AND a.rol = 'cliente' LIMIT 1) AS cliente
    FROM eventos e WHERE e.estado != 'publicado' AND e.producto = 'invitacion' AND e.empresa_id IS NULL AND e.actualizado > ? LIMIT 1000`).bind(desde).all();
  let enviados = 0;
  for (const e of results) {
    if (enviados >= tope) break;
    let contacto = null, hist = [], datos = {};
    try { contacto = JSON.parse(e.contacto || 'null'); } catch { /* nada */ }
    try { hist = JSON.parse(e.mails || '[]'); } catch { /* nada */ }
    try { datos = JSON.parse(e.datos || '{}'); } catch { /* nada */ }
    const email = contacto?.email || e.cliente;
    if (!email || await getState(env, `baja:${email.toLowerCase()}`)) continue;
    // El evento ya pasó: no tiene sentido
    const fecha = Date.parse(fechaEvento(datos) || '');
    if (fecha && fecha + DIA < ahora) continue;
    const ultima = Math.max(Date.parse(e.ingreso || '') || 0, Date.parse(e.actualizado || '') || 0);
    const inactivo = (ahora - ultima) / DIA;
    const ultimoMail = Math.max(0, ...hist.map((h) => Date.parse(h.fecha) || 0));
    if (ahora - ultimoMail < 3 * DIA) continue; // nunca dos mails seguidos (manual o automático) en menos de 3 días
    const r1 = hist.find((h) => h.tipo === 'auto1'), r2 = hist.find((h) => h.tipo === 'auto2');
    let tipo = null;
    if (!r1 && inactivo >= cfg.dias1) tipo = 'auto1';
    else if (r1 && !r2 && cfg.cupon && inactivo >= cfg.dias2) tipo = 'auto2';
    if (!tipo) continue;
    const cupon = tipo === 'auto2' ? cfg.cupon : '';
    if (cupon && !(await env.DB.prepare('SELECT 1 FROM cupones WHERE codigo = ? AND activo = 1').bind(cupon).first())) continue;
    const idioma = idiomaMail(contacto?.idioma || datos.variante);
    const url = `${sitio(env)}/panel/${e.id}?k=${e.clave_panel}`;
    try {
      const m = armar(env, idioma, tipo === 'auto1' ? 'r1' : 'r2', { nombres: nombresDe(datos), url, cupon, dias: cfg.diasCupon, baja: await linkBaja(env, email) });
      await sendEmail(env, { to: email, ...m });
      hist.push({ fecha: new Date(ahora).toISOString(), asunto: m.subject, cupon: cupon || null, para: [email], tipo });
      await setState(env, `mailborrador:${e.id}`, JSON.stringify(hist.slice(-20)));
      enviados++;
    } catch (err) { console.error('[recordatorio borrador]', e.id, err); }
  }
  return { enviados };
}
