// README (ronda 118) · Recordatorios a quien dejó la invitación sin terminar (reemplaza los de la ronda 83).
//   1.º automático: a las 24 h sin entrar al panel (borrador sin pagar, con mail y sin baja). Lo revisa la tarea de cada hora.
//   2.º manual, con descuento: desde la consola (Invitaciones → «✉ 2.º mail»), a los 3 días del 1.º (o del último ingreso,
//       si volvió a entrar). Genera un cupón propio: porcentaje elegido (10 % por defecto), un solo uso, vence a los 5 días.
// Todo en el idioma del cliente (el del panel: cookie «idioma»; si no, el de la invitación) y en plural cuando la invitación
// tiene dos nombres (boda, civil, compromiso) o en singular en los demás eventos. El texto del WhatsApp también va en su idioma.
// Historial de cada invitación en app_state['mailborrador:<evento>']: tipo 'auto1' (1.º), 'desc' (2.º con cupón), 'manual'.
import { plantilla, sendEmail } from './lib/email.js';
import { getState, setState } from './lib/verifactu.js';
import { randomId, now, HttpError, str } from './lib/util.js';
import { fechaEvento } from './vencimiento.js';
import { linkBaja, textosFijos } from './borradores.js';

const DIA = 86400000;
export const HORAS_1 = 24, DIAS_2 = 3, DIAS_CUPON = 5, PORCENTAJE = 10;
const sitio = (env) => String(env.SITE_URL || 'https://amoinvitar.com').replace(/\/$/, '');
const nombresDe = (d = {}) => [d.nombres?.a, d.nombres?.b].filter(Boolean).map((x) => String(x).trim()).join(' & ');

// ── Idioma del cliente ───────────────────────────────────────────────
// Claves de texto: es (neutro tú/ustedes), es-es (tú/vosotros), es-vos (vos/ustedes), en, pt-br, pt-pt, fr, it, de, nl
export const IDIOMAS_MAIL = [['es', 'Español neutro'], ['es-vos', 'Español rioplatense / vos'], ['es-es', 'Español de España'], ['en', 'English'], ['pt-br', 'Português (Brasil)'], ['pt-pt', 'Português (Portugal)'], ['fr', 'Français'], ['it', 'Italiano'], ['de', 'Deutsch'], ['nl', 'Nederlands']];
export function claveMail(x) {
  const v = String(x || '').toLowerCase();
  if (IDIOMAS_MAIL.some(([k]) => k === v)) return v;
  if (['es-ar', 'es-py', 'es-uy', 'es-cr'].includes(v)) return 'es-vos';
  if (v === 'pt' || v.startsWith('pt-br')) return 'pt-br';
  if (v.startsWith('pt')) return 'pt-pt';
  const c = v.slice(0, 2);
  return ['en', 'fr', 'it', 'de', 'nl'].includes(c) ? c : 'es';
}
// El idioma del panel que usó el cliente (se guarda al entrar) o el de la invitación
export async function idiomaClienteDe(env, ev, datos) {
  const v = await getState(env, `idiomacli:${ev.id}`).catch(() => null);
  return claveMail(v || (datos || ev.datos || {}).variante);
}
export const pluralDe = (tipo, datos = {}) => tipo === 'boda' || !!String(datos.nombres?.b || '').trim();

// ── Textos ───────────────────────────────────────────────────────────
// p: párrafos antes del cupón · d: después · [palabra] = link al WhatsApp · {n} = nombres
const ES = {
  b1: 'Seguir con la invitación', b2: 'Solicitar ayuda', wa: 'WhatsApp', rotulo: 'Código de descuento', valido: 'Válido por tiempo limitado.',
  waP: 'Hola, necesitamos ayuda con la invitación de {n}.', waS: 'Hola, necesito ayuda con la invitación de {n}.',
  r1: { asunto: 'La invitación de {n} está casi lista', titulo: '¡Falta muy poco!' },
  r2: { asunto: 'Completar la invitación de {n} tiene beneficios', titulo: '¡Descuento por tiempo limitado!' },
};
const T = {
  es: { ...ES,
    P: { r1: { p: ['Vimos que empezaron a armar la invitación de {n} y quedó sin terminar.', 'Y si tienen cualquier duda (diseño, textos, fotos o cómo enviarla), pueden responder este mail o contactarnos por [WhatsApp] y les ayudamos.', 'No se pierdan la oportunidad de tener la invitación lista hoy mismo.'] },
      r2: { p: ['La invitación de {n} quedó sin terminar. Queremos que no se pierdan esta oportunidad.', 'Para ayudarles a completarla, les dejamos un descuento especial. Y si tienen cualquier duda (diseño, textos, fotos o cómo enviarla), pueden responder este mail o contactarnos por [WhatsApp] y les ayudamos.'], d: ['Pueden tener la invitación lista hoy mismo.'] } },
    S: { r1: { p: ['Vimos que empezaste a armar la invitación de {n} y quedó sin terminar.', 'Y si tienes cualquier duda (diseño, textos, fotos o cómo enviarla), puedes responder este mail o contactarnos por [WhatsApp] y te ayudamos.', 'No te pierdas la oportunidad de tener la invitación lista hoy mismo.'] },
      r2: { p: ['La invitación de {n} quedó sin terminar. Queremos que no te pierdas esta oportunidad.', 'Para ayudarte a completarla, te dejamos un descuento especial. Y si tienes cualquier duda (diseño, textos, fotos o cómo enviarla), puedes responder este mail o contactarnos por [WhatsApp] y te ayudamos.'], d: ['Puedes tener la invitación lista hoy mismo.'] } } },
  'es-vos': { ...ES,
    P: { r1: { p: ['Vimos que empezaron a armar la invitación de {n} y quedó sin terminar.', 'Y si tienen cualquier duda (diseño, textos, fotos o cómo enviarla), pueden responder este mail o contactarnos por [WhatsApp] y les ayudamos.', 'No se pierdan la oportunidad de tener la invitación lista hoy mismo.'] },
      r2: { p: ['La invitación de {n} quedó sin terminar. Queremos que no se pierdan esta oportunidad.', 'Para ayudarles a completarla, les dejamos un descuento especial. Y si tienen cualquier duda (diseño, textos, fotos o cómo enviarla), pueden responder este mail o contactarnos por [WhatsApp] y les ayudamos.'], d: ['Pueden tener la invitación lista hoy mismo.'] } },
    S: { r1: { p: ['Vimos que empezaste a armar la invitación de {n} y quedó sin terminar.', 'Y si tenés cualquier duda (diseño, textos, fotos o cómo enviarla), podés responder este mail o contactarnos por [WhatsApp] y te ayudamos.', 'No te pierdas la oportunidad de tener la invitación lista hoy mismo.'] },
      r2: { p: ['La invitación de {n} quedó sin terminar. Queremos que no te pierdas esta oportunidad.', 'Para ayudarte a completarla, te dejamos un descuento especial. Y si tenés cualquier duda (diseño, textos, fotos o cómo enviarla), podés responder este mail o contactarnos por [WhatsApp] y te ayudamos.'], d: ['Podés tener la invitación lista hoy mismo.'] } } },
  'es-es': { ...ES,
    P: { r1: { p: ['Hemos visto que empezasteis a preparar la invitación de {n} y se quedó sin terminar.', 'Y si tenéis cualquier duda (diseño, textos, fotos o cómo enviarla), podéis responder a este correo o contactarnos por [WhatsApp] y os ayudamos.', 'No perdáis la oportunidad de tener la invitación lista hoy mismo.'] },
      r2: { p: ['La invitación de {n} se quedó sin terminar. No queremos que perdáis esta oportunidad.', 'Para ayudaros a completarla, os dejamos un descuento especial. Y si tenéis cualquier duda (diseño, textos, fotos o cómo enviarla), podéis responder a este correo o contactarnos por [WhatsApp] y os ayudamos.'], d: ['Podéis tener la invitación lista hoy mismo.'] } },
    S: { r1: { p: ['Hemos visto que empezaste a preparar la invitación de {n} y se quedó sin terminar.', 'Y si tienes cualquier duda (diseño, textos, fotos o cómo enviarla), puedes responder a este correo o contactarnos por [WhatsApp] y te ayudamos.', 'No pierdas la oportunidad de tener la invitación lista hoy mismo.'] },
      r2: { p: ['La invitación de {n} se quedó sin terminar. No queremos que pierdas esta oportunidad.', 'Para ayudarte a completarla, te dejamos un descuento especial. Y si tienes cualquier duda (diseño, textos, fotos o cómo enviarla), puedes responder a este correo o contactarnos por [WhatsApp] y te ayudamos.'], d: ['Puedes tener la invitación lista hoy mismo.'] } } },
  en: { b1: 'Continue with the invitation', b2: 'Ask for help', wa: 'WhatsApp', rotulo: 'Discount code', valido: 'Valid for a limited time.',
    waP: 'Hi, we need help with the invitation for {n}.', waS: 'Hi, I need help with the invitation for {n}.',
    r1: { asunto: 'The invitation for {n} is almost ready', titulo: 'Almost there!' },
    r2: { asunto: 'Finishing the invitation for {n} comes with a perk', titulo: 'Limited-time discount!' },
    P: { r1: { p: ['We noticed you started creating the invitation for {n} and didn’t finish it.', 'If you have any questions (design, texts, photos or how to send it), just reply to this email or contact us on [WhatsApp] and we’ll help you.', 'Don’t miss the chance to have your invitation ready today.'] },
      r2: { p: ['The invitation for {n} is still unfinished. We don’t want you to miss this chance.', 'To help you finish it, here’s a special discount. And if you have any questions (design, texts, photos or how to send it), just reply to this email or contact us on [WhatsApp] and we’ll help you.'], d: ['You can have your invitation ready today.'] } } },
  'pt-br': { b1: 'Continuar o convite', b2: 'Pedir ajuda', wa: 'WhatsApp', rotulo: 'Código de desconto', valido: 'Válido por tempo limitado.',
    waP: 'Olá, precisamos de ajuda com o convite de {n}.', waS: 'Olá, preciso de ajuda com o convite de {n}.',
    r1: { asunto: 'O convite de {n} está quase pronto', titulo: 'Falta muito pouco!' },
    r2: { asunto: 'Concluir o convite de {n} tem vantagens', titulo: 'Desconto por tempo limitado!' },
    P: { r1: { p: ['Vimos que vocês começaram a montar o convite de {n} e ele ficou sem terminar.', 'E se tiverem qualquer dúvida (design, textos, fotos ou como enviar), podem responder este e-mail ou falar com a gente pelo [WhatsApp] que ajudamos vocês.', 'Não percam a chance de ter o convite pronto hoje mesmo.'] },
      r2: { p: ['O convite de {n} ficou sem terminar. Não queremos que vocês percam esta oportunidade.', 'Para ajudar vocês a concluí-lo, deixamos um desconto especial. E se tiverem qualquer dúvida (design, textos, fotos ou como enviar), podem responder este e-mail ou falar com a gente pelo [WhatsApp] que ajudamos vocês.'], d: ['Vocês podem ter o convite pronto hoje mesmo.'] } },
    S: { r1: { p: ['Vimos que você começou a montar o convite de {n} e ele ficou sem terminar.', 'E se tiver qualquer dúvida (design, textos, fotos ou como enviar), pode responder este e-mail ou falar com a gente pelo [WhatsApp] que ajudamos você.', 'Não perca a chance de ter o convite pronto hoje mesmo.'] },
      r2: { p: ['O convite de {n} ficou sem terminar. Não queremos que você perca esta oportunidade.', 'Para ajudar você a concluí-lo, deixamos um desconto especial. E se tiver qualquer dúvida (design, textos, fotos ou como enviar), pode responder este e-mail ou falar com a gente pelo [WhatsApp] que ajudamos você.'], d: ['Você pode ter o convite pronto hoje mesmo.'] } } },
  'pt-pt': { b1: 'Continuar o convite', b2: 'Pedir ajuda', wa: 'WhatsApp', rotulo: 'Código de desconto', valido: 'Válido por tempo limitado.',
    waP: 'Olá, precisamos de ajuda com o convite de {n}.', waS: 'Olá, preciso de ajuda com o convite de {n}.',
    r1: { asunto: 'O convite de {n} está quase pronto', titulo: 'Falta muito pouco!' },
    r2: { asunto: 'Terminar o convite de {n} tem vantagens', titulo: 'Desconto por tempo limitado!' },
    P: { r1: { p: ['Vimos que começaram a preparar o convite de {n} e ficou por terminar.', 'Se tiverem alguma dúvida (design, textos, fotos ou como enviá-lo), podem responder a este e-mail ou falar connosco pelo [WhatsApp] e ajudamos.', 'Não percam a oportunidade de ter o convite pronto hoje mesmo.'] },
      r2: { p: ['O convite de {n} ficou por terminar. Não queremos que percam esta oportunidade.', 'Para vos ajudar a terminá-lo, deixamos-vos um desconto especial. Se tiverem alguma dúvida (design, textos, fotos ou como enviá-lo), podem responder a este e-mail ou falar connosco pelo [WhatsApp] e ajudamos.'], d: ['Podem ter o convite pronto hoje mesmo.'] } },
    S: { r1: { p: ['Vimos que começaste a preparar o convite de {n} e ficou por terminar.', 'Se tiveres alguma dúvida (design, textos, fotos ou como enviá-lo), podes responder a este e-mail ou falar connosco pelo [WhatsApp] e ajudamos-te.', 'Não percas a oportunidade de ter o convite pronto hoje mesmo.'] },
      r2: { p: ['O convite de {n} ficou por terminar. Não queremos que percas esta oportunidade.', 'Para te ajudar a terminá-lo, deixamos-te um desconto especial. Se tiveres alguma dúvida (design, textos, fotos ou como enviá-lo), podes responder a este e-mail ou falar connosco pelo [WhatsApp] e ajudamos-te.'], d: ['Podes ter o convite pronto hoje mesmo.'] } } },
  fr: { b1: 'Continuer l’invitation', b2: 'Demander de l’aide', wa: 'WhatsApp', rotulo: 'Code de réduction', valido: 'Valable pour une durée limitée.',
    waP: 'Bonjour, nous avons besoin d’aide pour l’invitation de {n}.', waS: 'Bonjour, j’ai besoin d’aide pour l’invitation de {n}.',
    r1: { asunto: 'L’invitation de {n} est presque prête', titulo: 'Plus qu’un petit effort !' },
    r2: { asunto: 'Terminer l’invitation de {n} a ses avantages', titulo: 'Réduction pour une durée limitée !' },
    P: { r1: { p: ['Nous avons vu que vous avez commencé à préparer l’invitation de {n} sans la terminer.', 'Si vous avez la moindre question (design, textes, photos ou envoi), répondez simplement à cet e-mail ou contactez-nous sur [WhatsApp] : nous vous aiderons.', 'Ne manquez pas l’occasion d’avoir votre invitation prête dès aujourd’hui.'] },
      r2: { p: ['L’invitation de {n} n’est pas encore terminée. Nous ne voulons pas que vous manquiez cette occasion.', 'Pour vous aider à la terminer, voici une réduction spéciale. Et si vous avez la moindre question (design, textes, photos ou envoi), répondez à cet e-mail ou contactez-nous sur [WhatsApp] : nous vous aiderons.'], d: ['Votre invitation peut être prête dès aujourd’hui.'] } } },
  it: { b1: 'Continua l’invito', b2: 'Chiedi aiuto', wa: 'WhatsApp', rotulo: 'Codice sconto', valido: 'Valido per un tempo limitato.',
    waP: 'Ciao, abbiamo bisogno di aiuto con l’invito di {n}.', waS: 'Ciao, ho bisogno di aiuto con l’invito di {n}.',
    r1: { asunto: 'L’invito di {n} è quasi pronto', titulo: 'Manca pochissimo!' },
    r2: { asunto: 'Completare l’invito di {n} ha i suoi vantaggi', titulo: 'Sconto per un tempo limitato!' },
    P: { r1: { p: ['Abbiamo visto che avete iniziato a preparare l’invito di {n} e non l’avete terminato.', 'Se avete qualsiasi dubbio (design, testi, foto o come inviarlo), potete rispondere a questa email o contattarci su [WhatsApp]: vi aiutiamo noi.', 'Non perdete l’occasione di avere l’invito pronto oggi stesso.'] },
      r2: { p: ['L’invito di {n} non è ancora finito. Non vogliamo che perdiate questa occasione.', 'Per aiutarvi a completarlo, vi lasciamo uno sconto speciale. E se avete qualsiasi dubbio (design, testi, foto o come inviarlo), potete rispondere a questa email o contattarci su [WhatsApp]: vi aiutiamo noi.'], d: ['Potete avere l’invito pronto oggi stesso.'] } },
    S: { r1: { p: ['Abbiamo visto che hai iniziato a preparare l’invito di {n} e non l’hai terminato.', 'Se hai qualsiasi dubbio (design, testi, foto o come inviarlo), puoi rispondere a questa email o contattarci su [WhatsApp]: ti aiutiamo noi.', 'Non perdere l’occasione di avere l’invito pronto oggi stesso.'] },
      r2: { p: ['L’invito di {n} non è ancora finito. Non vogliamo che tu perda questa occasione.', 'Per aiutarti a completarlo, ti lasciamo uno sconto speciale. E se hai qualsiasi dubbio (design, testi, foto o come inviarlo), puoi rispondere a questa email o contattarci su [WhatsApp]: ti aiutiamo noi.'], d: ['Puoi avere l’invito pronto oggi stesso.'] } } },
  de: { b1: 'Mit der Einladung weitermachen', b2: 'Hilfe anfragen', wa: 'WhatsApp', rotulo: 'Rabattcode', valido: 'Nur für kurze Zeit gültig.',
    waP: 'Hallo, wir brauchen Hilfe mit der Einladung von {n}.', waS: 'Hallo, ich brauche Hilfe mit der Einladung von {n}.',
    r1: { asunto: 'Die Einladung von {n} ist fast fertig', titulo: 'Fast geschafft!' },
    r2: { asunto: 'Die Einladung von {n} fertigzustellen lohnt sich', titulo: 'Rabatt für kurze Zeit!' },
    P: { r1: { p: ['Wir haben gesehen, dass ihr mit der Einladung von {n} angefangen, sie aber noch nicht fertiggestellt habt.', 'Wenn ihr Fragen habt (Design, Texte, Fotos oder wie ihr sie verschickt), antwortet einfach auf diese E-Mail oder schreibt uns auf [WhatsApp] – wir helfen euch gern.', 'Verpasst nicht die Chance, eure Einladung noch heute fertig zu haben.'] },
      r2: { p: ['Die Einladung von {n} ist noch nicht fertig. Wir möchten nicht, dass ihr diese Gelegenheit verpasst.', 'Damit ihr sie fertigstellen könnt, schenken wir euch einen besonderen Rabatt. Und wenn ihr Fragen habt (Design, Texte, Fotos oder wie ihr sie verschickt), antwortet einfach auf diese E-Mail oder schreibt uns auf [WhatsApp] – wir helfen euch gern.'], d: ['Eure Einladung kann noch heute fertig sein.'] } },
    S: { r1: { p: ['Wir haben gesehen, dass du mit der Einladung von {n} angefangen, sie aber noch nicht fertiggestellt hast.', 'Wenn du Fragen hast (Design, Texte, Fotos oder wie du sie verschickst), antworte einfach auf diese E-Mail oder schreib uns auf [WhatsApp] – wir helfen dir gern.', 'Verpasse nicht die Chance, deine Einladung noch heute fertig zu haben.'] },
      r2: { p: ['Die Einladung von {n} ist noch nicht fertig. Wir möchten nicht, dass du diese Gelegenheit verpasst.', 'Damit du sie fertigstellen kannst, schenken wir dir einen besonderen Rabatt. Und wenn du Fragen hast (Design, Texte, Fotos oder wie du sie verschickst), antworte einfach auf diese E-Mail oder schreib uns auf [WhatsApp] – wir helfen dir gern.'], d: ['Deine Einladung kann noch heute fertig sein.'] } } },
  nl: { b1: 'Verder met de uitnodiging', b2: 'Hulp vragen', wa: 'WhatsApp', rotulo: 'Kortingscode', valido: 'Beperkte tijd geldig.',
    waP: 'Hallo, we hebben hulp nodig met de uitnodiging van {n}.', waS: 'Hallo, ik heb hulp nodig met de uitnodiging van {n}.',
    r1: { asunto: 'De uitnodiging van {n} is bijna klaar', titulo: 'Nog heel even!' },
    r2: { asunto: 'De uitnodiging van {n} afmaken heeft voordelen', titulo: 'Korting voor korte tijd!' },
    P: { r1: { p: ['We zagen dat jullie begonnen zijn met de uitnodiging van {n}, maar dat die nog niet af is.', 'Hebben jullie vragen (ontwerp, teksten, foto’s of hoe je hem verstuurt)? Beantwoord gewoon deze e-mail of neem contact op via [WhatsApp], dan helpen we jullie.', 'Mis de kans niet om de uitnodiging vandaag nog klaar te hebben.'] },
      r2: { p: ['De uitnodiging van {n} is nog niet af. We willen niet dat jullie deze kans missen.', 'Om jullie te helpen hem af te maken, geven we jullie een speciale korting. En hebben jullie vragen (ontwerp, teksten, foto’s of hoe je hem verstuurt)? Beantwoord gewoon deze e-mail of neem contact op via [WhatsApp], dan helpen we jullie.'], d: ['Jullie kunnen de uitnodiging vandaag nog klaar hebben.'] } },
    S: { r1: { p: ['We zagen dat je begonnen bent met de uitnodiging van {n}, maar dat die nog niet af is.', 'Heb je vragen (ontwerp, teksten, foto’s of hoe je hem verstuurt)? Beantwoord gewoon deze e-mail of neem contact op via [WhatsApp], dan helpen we je.', 'Mis de kans niet om de uitnodiging vandaag nog klaar te hebben.'] },
      r2: { p: ['De uitnodiging van {n} is nog niet af. We willen niet dat je deze kans mist.', 'Om je te helpen hem af te maken, geven we je een speciale korting. En heb je vragen (ontwerp, teksten, foto’s of hoe je hem verstuurt)? Beantwoord gewoon deze e-mail of neem contact op via [WhatsApp], dan helpen we je.'], d: ['Je kunt de uitnodiging vandaag nog klaar hebben.'] } } },
};

// Los textos de un recordatorio, listos para editar en la consola (párrafos separados por una línea en blanco)
export function textosRecordatorio(tipo, idioma, plural, nombres) {
  const L = T[claveMail(idioma)] || T.es, clave = tipo === 'r2' ? 'r2' : 'r1';
  const cuerpo = ((plural ? L.P : L.S || L.P) || L.P)[clave];
  const n = (x) => String(x || '').replaceAll('{n}', nombres || '');
  return {
    asunto: n(L[clave].asunto), titulo: n(L[clave].titulo), texto: cuerpo.p.map(n).join('\n\n'), despues: (cuerpo.d || []).map(n).join('\n\n'),
    boton: L.b1, boton2: L.b2, waTexto: n(plural ? L.waP : L.waS), rotulo: L.rotulo, valido: L.valido,
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const linkWa = (env, texto) => { const n = String(env.WHATSAPP || '').replace(/\D/g, ''); return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto || '')}` : ''; };
// Arma el mail: párrafos (con [palabra] → link al WhatsApp), cupón, botón al panel y botón de ayuda por WhatsApp
export function mailRecordatorio(env, { idioma, asunto, titulo, texto, despues, boton, boton2, waTexto, cupon, rotulo, valido, url, baja }) {
  const wa = linkWa(env, waTexto);
  const parrafos = (x) => String(x || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => esc(p).replace(/\n/g, '<br>').replace(/\[([^\]]{1,40})\]/g, (m, w) => (wa ? `<a href="${esc(wa)}" style="color:#4e9c87;font-weight:bold">${w}</a>` : w)));
  return {
    subject: String(asunto || '').replace(/\s{2,}/g, ' ').trim(),
    ...plantilla(env, {
      titulo, lineas: parrafos(texto), lineasDespues: parrafos(despues), boton, url, baja, fijos: textosFijos(idioma),
      destacado: cupon ? { rotulo, codigo: cupon, nota: valido || '' } : null,
      boton2: wa && boton2 ? { texto: boton2, url: wa } : null,
    }),
  };
}

// ── Estado de cada invitación (para la tarea automática y la consola) ──
export function historial(valor) { try { return JSON.parse(valor || '[]'); } catch { return []; } }
// El 2.º mail se puede mandar a los 3 días del 1.º, o del último ingreso al panel si volvió a entrar después
export function estadoRecordatorios({ hist, ingreso, estado, paquete, ahora = Date.now() }) {
  const primero = hist.find((h) => h.tipo === 'auto1' || h.tipo === 'r1');
  const descuento = hist.find((h) => h.tipo === 'desc');
  let segundo = null;
  if (primero && !descuento && estado !== 'publicado' && paquete === 'borrador') {
    const desde = Math.max(Date.parse(primero.fecha) || 0, Date.parse(ingreso || '') || 0) + DIAS_2 * DIA;
    segundo = { listo: ahora >= desde, desde: new Date(desde).toISOString() };
  }
  return { primero: primero ? { fecha: primero.fecha, auto: primero.tipo === 'auto1' } : null, descuento: descuento ? { fecha: descuento.fecha, cupon: descuento.cupon || null } : null, segundo };
}

async function destinatarios(env, evId, contacto) {
  const { results = [] } = await env.DB.prepare("SELECT u.email FROM accesos_evento a JOIN usuarios u ON u.id = a.usuario_id WHERE a.evento_id = ? AND a.rol = 'cliente'").bind(evId).all();
  const lista = results.map((x) => String(x.email || '').toLowerCase()).filter(Boolean);
  if (contacto?.email && !lista.includes(contacto.email.toLowerCase())) lista.push(contacto.email.toLowerCase());
  const admins = String(env.ADMINS || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  const para = [];
  for (const m of lista) if (!admins.includes(m) && !(await getState(env, `baja:${m}`))) para.push(m);
  return { todos: lista, para };
}
const guardarHist = async (env, id, hist) => setState(env, `mailborrador:${id}`, JSON.stringify(hist.slice(-20)));

// ── 1.º automático (cada hora) ──
export const CONFIG_DEFECTO = { activo: true };
export async function configRecordatorios(env) {
  try { return { ...CONFIG_DEFECTO, ...JSON.parse((await getState(env, 'recordatorios')) || '{}') }; } catch { return { ...CONFIG_DEFECTO }; }
}
export async function guardarConfigRecordatorios(env, b) { const c = { activo: b.activo !== false }; await setState(env, 'recordatorios', JSON.stringify(c)); return c; }

export async function recordatoriosAutomaticos(env, { ahora = Date.now(), tope = 50, forzar = false } = {}) {
  const cfg = await configRecordatorios(env);
  if (!cfg.activo && !forzar) return { enviados: 0, apagado: true };
  // Solo borradores con movimiento en los últimos 30 días (no se escribe a invitaciones abandonadas hace meses)
  const desde = new Date(ahora - 30 * DIA).toISOString();
  const { results = [] } = await env.DB.prepare(`SELECT e.id, e.tipo, e.datos, e.clave_panel, e.creado, e.actualizado,
      (SELECT value FROM app_state WHERE key = 'ingreso:' || e.id) AS ingreso,
      (SELECT value FROM app_state WHERE key = 'contacto:' || e.id) AS contacto,
      (SELECT value FROM app_state WHERE key = 'mailborrador:' || e.id) AS mails
    FROM eventos e WHERE e.estado != 'publicado' AND e.paquete = 'borrador' AND e.producto IN ('invitacion', 'compromiso-web') AND e.empresa_id IS NULL AND e.actualizado > ? LIMIT 2000`).bind(desde).all();
  let enviados = 0;
  for (const e of results) {
    if (enviados >= tope) break;
    const hist = historial(e.mails);
    if (hist.some((h) => ['auto1', 'r1', 'desc'].includes(h.tipo))) continue;
    if (hist.some((h) => ahora - (Date.parse(h.fecha) || 0) < DIAS_2 * DIA)) continue; // nunca dos mails en menos de 3 días
    let datos = {}, contacto = null;
    try { datos = JSON.parse(e.datos || '{}'); } catch { /* nada */ }
    try { contacto = JSON.parse(e.contacto || 'null'); } catch { /* nada */ }
    const ultima = Math.max(Date.parse(e.ingreso || '') || 0, Date.parse(e.creado || '') || 0);
    if (!ultima || ahora - ultima < HORAS_1 * 3600000 || ahora - ultima > 30 * DIA) continue;
    const fecha = Date.parse(fechaEvento(datos) || '');
    if (fecha && fecha + DIA < ahora) continue; // el evento ya pasó
    const { para } = await destinatarios(env, e.id, contacto);
    if (!para.length) continue;
    try {
      const r = await enviarRecordatorio(env, { ev: { id: e.id, tipo: e.tipo, clave: e.clave_panel, datos }, tipo: 'r1', para, hist, auto: true, ahora });
      if (r) enviados++;
    } catch (err) { console.error('[recordatorio]', e.id, err); }
  }
  return { enviados };
}

// Envía un recordatorio (automático o desde la consola). textos: los editados en la consola (si no, los del idioma)
export async function enviarRecordatorio(env, { ev, tipo, para, hist, auto = false, textos = null, idioma = null, porcentaje = PORCENTAJE, dias = DIAS_CUPON, prueba = false, ahora = Date.now() }) {
  const lengua = claveMail(idioma || await idiomaClienteDe(env, ev, ev.datos));
  const t = { ...textosRecordatorio(tipo, lengua, pluralDe(ev.tipo, ev.datos), nombresDe(ev.datos)), ...(textos || {}) };
  let cupon = '';
  if (tipo === 'r2') {
    if (prueba) cupon = 'PRUEBA10';
    else cupon = await crearCuponSistema(env, { porcentaje, dias, nota: `[auto] 2.º recordatorio · ${nombresDe(ev.datos) || ev.id} · ${ev.id}` });
  }
  const url = `${sitio(env)}/panel/${ev.id}?k=${ev.clave}`;
  for (const m of para) await sendEmail(env, { to: m, ...mailRecordatorio(env, { idioma: lengua, ...t, cupon, url, baja: await linkBaja(env, m) }) });
  if (prueba) return { para, cupon };
  hist.push({ fecha: new Date(ahora).toISOString(), asunto: t.asunto, cupon: cupon || null, para, tipo: tipo === 'r2' ? 'desc' : auto ? 'auto1' : 'r1', idioma: lengua });
  await guardarHist(env, ev.id, hist);
  return { para, cupon };
}

// ── Cupones del sistema: un solo uso, vencen a los N días; se reconocen por la nota «[auto]» ──
export const ES_SISTEMA = (c) => /^\[auto\]/.test(c?.nota || '');
export async function crearCuponSistema(env, { porcentaje = PORCENTAJE, dias = DIAS_CUPON, nota }) {
  const valor = Math.min(90, Math.max(1, Math.round(Number(porcentaje) || PORCENTAJE)));
  const vence = now() + Math.max(1, Math.min(60, parseInt(dias, 10) || DIAS_CUPON)) * 86400;
  for (let i = 0; i < 5; i++) {
    const codigo = `VUELVE${valor}${randomId(4).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}`;
    if (await env.DB.prepare('SELECT 1 FROM cupones WHERE codigo = ?').bind(codigo).first()) continue;
    await env.DB.prepare('INSERT INTO cupones (codigo, clase, valor, paquetes, max_usos, usos, vence, activo, nota, creado) VALUES (?, ?, ?, NULL, 1, 0, ?, 1, ?, ?)')
      .bind(codigo, 'porcentaje', valor, vence, str(nota, 200), now()).run();
    return codigo;
  }
  throw new HttpError(500, 'No se pudo generar el cupón');
}
// Los del sistema vencidos y sin usar se borran solos (los usados quedan, marcados como usados)
export async function limpiarCuponesSistema(env) {
  const r = await env.DB.prepare("DELETE FROM cupones WHERE nota LIKE '[auto]%' AND usos = 0 AND vence IS NOT NULL AND vence < ?").bind(now()).run().catch(() => null);
  return r?.meta?.changes || 0;
}
