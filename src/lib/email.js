// Mails con Resend (https://resend.com). Sin RESEND_API_KEY (pruebas), el mail se muestra en la consola.
// Los textos evitan el tú y el vos para que sirvan igual en todos los países.
import { escapeHtml } from './util.js';

export async function sendEmail(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) {
    console.log(`[mail] Para: ${to}\nAsunto: ${subject}\n${text}\n`);
    env.ULTIMOS_MAILS?.push({ to, subject, text });
    return { prueba: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM || 'Amo Invitar <hola@amoinvitar.com>', to: [to], subject, html, text,
      reply_to: replyTo || env.SUPPORT_EMAIL || undefined,
      headers: { 'X-Entity-Ref-ID': crypto.randomUUID() }, // que Gmail no agrupe los mails en un hilo
    }),
  });
  if (!res.ok) {
    console.error('[mail] error', res.status, await res.text());
    throw new Error('No se pudo enviar el mail');
  }
  return res.json();
}

const sitio = (env) => String(env.SITE_URL || 'https://amoinvitar.com').replace(/\/$/, '');

// README (ronda 39): los mails usan el verde principal del sitio (#4e9c87) en botones y links
const enlaces = (h) => String(h).replace(/<a (?![^>]*style=)/g, '<a style="color:#4e9c87;font-weight:bold;text-decoration:underline" ');
// README (ronda 83): los mails a borradores van en el idioma del cliente: «fijos» cambia los textos fijos de la plantilla
export function plantilla(env, { titulo, lineas, boton, url, pie, destacado, baja, fijos = {} }) {
  const F = { botonNo: 'Si el botón no funciona, copiar este link en el navegador:', firma: 'El equipo de Amo Invitar!', baja: 'Si no se quieren recibir más mails como este:', bajaLink: 'darse de baja', bajaTexto: 'Para no recibir más mails como este:', ...fijos };
  lineas = (lineas || []).map(enlaces); pie = pie ? enlaces(pie) : pie;
  const s = sitio(env);
  const html = `<!doctype html><html><body style="margin:0;background:#f1efe9;font-family:Helvetica,Arial,sans-serif;color:#1f2421">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:18px;padding:36px 32px">
<tr><td style="padding-bottom:22px"><img src="${s}/comun/img/amoinvitar-email.png" width="150" height="32" alt="Amo Invitar!" style="display:block;border:0"></td></tr>
<tr><td style="font-size:22px;font-weight:bold;color:#2f6f5f;padding-bottom:12px">${escapeHtml(titulo)}</td></tr>
${lineas.map((l) => `<tr><td style="font-size:16px;line-height:1.55;padding-bottom:12px">${l}</td></tr>`).join('')}
${destacado ? `<tr><td style="padding:6px 0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef6f3;border:2px dashed #4e9c87;border-radius:14px"><tr><td align="center" style="padding:18px 12px">
<div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#2f6f5f;padding-bottom:6px">${escapeHtml(destacado.rotulo)}</div>
<div style="font-size:28px;font-weight:bold;letter-spacing:3px;color:#1f2421;font-family:'Courier New',monospace">${escapeHtml(destacado.codigo)}</div>
${destacado.nota ? `<div style="font-size:13px;color:#6b706c;padding-top:6px">${escapeHtml(destacado.nota)}</div>` : ''}</td></tr></table></td></tr>` : ''}
${boton ? `<tr><td style="padding:12px 0 22px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#4e9c87;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px">${escapeHtml(boton)}</a></td></tr>
<tr><td style="font-size:13px;color:#6b706c;line-height:1.5;padding-bottom:12px">${escapeHtml(F.botonNo)}<br><a href="${escapeHtml(url)}" style="color:#4e9c87;word-break:break-all">${escapeHtml(url)}</a></td></tr>` : ''}
${pie ? `<tr><td style="font-size:13px;color:#6b706c;padding-bottom:12px">${pie}</td></tr>` : ''}
<tr><td style="font-size:13px;color:#6b706c;border-top:1px solid #f1efe9;padding-top:16px">${escapeHtml(F.firma)}<br>${escapeHtml(env.SUPPORT_EMAIL || 'hola@amoinvitar.com')}</td></tr>
</table>${baja ? `<p style="font-size:12px;color:#8a8f8b;margin:14px 0 0">${escapeHtml(F.baja)} <a href="${escapeHtml(baja)}" style="color:#8a8f8b">${escapeHtml(F.bajaLink)}</a>.</p>` : ''}</td></tr></table></body></html>`;
  const quitar = (x) => x.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const text = [titulo, '', ...lineas.map(quitar), destacado ? `\n${destacado.rotulo}: ${destacado.codigo}${destacado.nota ? ` (${destacado.nota})` : ''}\n` : '', boton ? `${boton}: ${url}` : '', pie ? quitar(pie) : '', '', F.firma, baja ? `\n${F.bajaTexto} ${baja}` : ''].join('\n');
  return { html, text };
}

const b = (s) => `<b>${escapeHtml(s)}</b>`;

export const mailAcceso = (env, url) => ({
  subject: 'Tu link para entrar a Amo Invitar!',
  ...plantilla(env, {
    titulo: 'Entrar a Amo Invitar!',
    lineas: ['Con este botón se entra a la cuenta, sin contraseña. El link vale por 15 minutos y sirve una sola vez.'],
    boton: 'Entrar', url,
    pie: 'Si no fue un pedido propio, se puede ignorar este mail.',
  }),
});

export const mailPedidoListo = (env, { url, producto, numero, gratis }) => ({
  subject: gratis ? '¡Tu invitación está lista para completar!' : `¡Gracias por tu compra! Pedido #${numero}`,
  ...plantilla(env, {
    titulo: gratis ? '¡Tu invitación está lista!' : '¡Pago recibido!',
    lineas: [
      `${gratis ? 'Ya está creada' : 'Ya está activa'}: ${b(producto)}${numero ? ` (pedido ${b('#' + numero)})` : ''}.`,
      'Desde el panel se cargan los nombres, las fotos, los lugares y todo lo demás. Se guarda solo y se puede ver cómo queda mientras se completa.',
    ],
    boton: 'Abrir el panel', url,
    pie: 'Para volver más adelante: entrar en amoinvitar.com con este mismo mail.',
  }),
});

export const mailTransferencia = (env, { url, producto, numero, importe, datos }) => ({
  subject: `Datos para la transferencia · pedido #${numero}`,
  ...plantilla(env, {
    titulo: 'Datos para la transferencia',
    lineas: [
      `Pedido ${b('#' + numero)}: ${b(producto)} · ${b(importe)}.`,
      `<pre style="font-family:inherit;white-space:pre-wrap;background:#f6f5f3;border-radius:10px;padding:12px;margin:0">${escapeHtml(datos)}</pre>`,
      `En el concepto, poner ${b('Pedido ' + numero)}. Cuando llegue el pago se activa y llega un mail. Mientras tanto ya se puede empezar a cargar todo en el panel.`,
    ],
    boton: 'Abrir el panel', url,
  }),
});

export const mailAvisoInterno = (env, { asunto, lineas }) => ({
  subject: asunto,
  ...plantilla(env, { titulo: asunto, lineas: lineas.map(escapeHtml) }),
});

export const mailFactura = (env, { url, numero, producto }) => ({
  subject: `Factura ${numero} · Amo Invitar`,
  ...plantilla(env, {
    titulo: 'Tu factura',
    lineas: [`Factura ${b(numero)} de ${b(producto)}.`, 'Se puede ver y descargar en PDF desde el botón. El link queda disponible siempre.'],
    boton: 'Ver la factura', url,
  }),
});

// Aviso a los dueños antes del cierre de la confirmación (lo manda la tarea diaria)
export const mailAvisoCierre = (env, { nombres, dias, sinResponder, noAbrieron, url }) => ({
  subject: `${dias === 1 ? 'Mañana' : `En ${dias} días`} cierra la confirmación · ${sinResponder} sin responder`,
  ...plantilla(env, {
    titulo: `Faltan ${dias} ${dias === 1 ? 'día' : 'días'} para el cierre de la lista`,
    lineas: [
      `En la invitación de ${b(nombres)} todavía hay ${b(String(sinResponder))} ${sinResponder === 1 ? 'invitado que no respondió' : 'invitados que no respondieron'}${noAbrieron ? ` (${noAbrieron} ni siquiera ${noAbrieron === 1 ? 'abrió su link' : 'abrieron su link'})` : ''}.`,
      'Desde Administración → Respuestas se les manda un recordatorio por WhatsApp a todos juntos, con el botón "Recordar a todos".',
    ],
    boton: 'Mandar los recordatorios', url,
    pie: 'Estos avisos se pueden apagar en Administración → Enviar.',
  }),
});

// Respuestas nuevas de la confirmación (una sola o el resumen del día)
export const mailRespuestas = (env, { nombres, respuestas, url, resumen = false, tope = false }) => {
  const si = respuestas.filter((r) => r.asiste).length, no = respuestas.length - si;
  const uno = respuestas.length === 1 && !resumen ? respuestas[0] : null;
  const linea = (r) => `${r.asiste ? '✅' : '❌'} ${b(r.nombre)}${r.asiste && /^\d+$/.test(String(r.personas || '')) && Number(r.personas) > 1 ? ` (${escapeHtml(String(r.personas))} personas)` : ''}${r.mensaje ? ` <br><span style="color:#6b706c">“${escapeHtml(r.mensaje)}”</span>` : ''}`;
  return {
    subject: uno ? `${uno.asiste ? 'Confirmó' : 'No va'}: ${uno.nombre} · ${nombres}` : `${respuestas.length} respuestas nuevas · ${nombres}`,
    ...plantilla(env, {
      titulo: uno ? `Nueva respuesta en la invitación de ${nombres}` : `Respuestas de las últimas 24 horas`,
      lineas: [
        ...(uno ? [] : [`En la invitación de ${b(nombres)}: ${b(String(si))} ${si === 1 ? 'confirmó' : 'confirmaron'} y ${b(String(no))} no ${no === 1 ? 'va' : 'van'}.`]),
        ...respuestas.slice(0, 40).map(linea),
        ...(respuestas.length > 40 ? [`Y ${respuestas.length - 40} más en el panel.`] : []),
        ...(tope ? ['Por hoy no llegan más avisos de a uno: las próximas respuestas llegan juntas mañana en un resumen.'] : []),
      ],
      boton: 'Ver todas las respuestas', url,
      pie: 'Estos avisos se cambian o se apagan en Administración → Respuestas.',
    }),
  };
};

// Le dieron acceso a una invitación (la pareja o un administrador: wedding planner, organizador…)
export const mailNuevoAcceso = (env, { nombres, rol, url, quien }) => ({
  subject: `Acceso a la invitación de ${nombres}`,
  ...plantilla(env, {
    titulo: `Acceso a la invitación de ${nombres}`,
    lineas: [
      `${quien ? `${b(quien)} dio` : 'Se dio'} acceso a este mail para ${rol === 'pareja' ? 'editar y administrar la invitación como parte de la pareja' : 'ayudar a editar y administrar la invitación'}: textos, fotos, lista de invitados, confirmaciones y más.`,
      'Se entra con este mismo mail (link por correo o con Google), sin contraseña.',
    ],
    boton: 'Entrar a la invitación', url,
  }),
});

// README (ronda 28): diseño a medida. El equipo lo aprueba y el cliente paga para que empiece el diseño
export const mailMedidaAprobada = (env, { url, nombres }) => ({
  subject: 'Tu proyecto fue aprobado',
  ...plantilla(env, {
    titulo: '¡Tu proyecto fue aprobado!',
    lineas: [`El equipo de diseño revisó la idea${nombres ? ` de ${b(nombres)}` : ''} y la aprobó.`, 'Completa el pago para que comencemos a crear tu invitación.'],
    boton: 'Completar el pago', url,
  }),
});

// README (ronda 33) · Cuentas profesionales
export const mailSolicitudProRecibida = (env, { nombre }) => ({
  subject: 'Recibimos tu solicitud de cuenta profesional',
  ...plantilla(env, {
    titulo: 'Recibimos tu solicitud',
    lineas: [`Gracias${nombre ? `, ${b(nombre)}` : ''}, por interesarte en las cuentas para profesionales de Amo Invitar!.`, 'El equipo revisa cada solicitud (por eso se pide la web o la red social y una descripción del trabajo) y responde por este mismo medio.'],
  }),
});

export const mailProAprobada = (env, { nombre, nivel, url }) => ({
  subject: 'Tu cuenta profesional fue aprobada',
  ...plantilla(env, {
    titulo: '¡Tu cuenta profesional fue aprobada!',
    lineas: [`${nombre ? `${b(nombre)}: ` : ''}la cuenta quedó aprobada en el nivel ${b(nivel)}.`, 'El equipo escribe en breve, por este mismo medio, con los pasos para empezar (créditos, equipo y marca). La cuenta se identifica con este mail, sin contraseñas.'],
    boton: 'Ir a Amo Invitar!', url,
  }),
});

export const mailProRechazada = (env, { nombre, motivo }) => ({
  subject: 'Sobre tu solicitud de cuenta profesional',
  ...plantilla(env, {
    titulo: 'Sobre tu solicitud',
    lineas: [`Gracias${nombre ? `, ${b(nombre)}` : ''}, por escribir. Por ahora no se pudo aprobar la cuenta profesional.`, ...(motivo ? [escapeHtml(motivo)] : []), 'Si hay más información para compartir (web, trabajos, referencias), se puede responder este mail y se vuelve a revisar.'],
  }),
});

// README (ronda 35) · Tablero profesional
export const mailEquipoPro = (env, { empresa, quien, url }) => ({
  subject: `Te sumaron al equipo de ${empresa}`,
  ...plantilla(env, {
    titulo: `Equipo de ${empresa}`,
    lineas: [`${b(quien)} sumó este mail al equipo de ${b(empresa)} en Amo Invitar!.`, 'Se entra con este mismo mail (sin contraseñas) y se pueden ver y armar los eventos de la empresa.'],
    boton: 'Entrar al tablero', url,
  }),
});

export const mailCompraPro = (env, { numero, producto, total, referencia, datos }) => ({
  subject: `Pedido #${numero} · ${producto}`,
  ...plantilla(env, {
    titulo: `Pedido #${numero}`,
    lineas: [`${b(producto)}`, `Importe a transferir: ${b(total)}`, `Referencia: ${b(referencia)}`, ...(datos ? [`Datos para la transferencia:<br>${escapeHtml(datos).replace(/\n/g, '<br>')}`] : ['Escribir a hola@amoinvitar.com para recibir los datos de la cuenta.']),
      'Cuando llega la transferencia se activan los créditos (o el pase) y se emite la factura. Llega un mail de confirmación.'],
  }),
});

export const mailRecuerdoVence = (env, { nombres, dias, fecha, url, compradas = [] }) => ({
  subject: dias <= 1 ? `Hoy sale de línea la invitación de ${nombres}` : `La invitación de ${nombres} sale de línea en ${dias} días`,
  ...plantilla(env, {
    titulo: dias <= 1 ? 'Tu invitación sale de línea' : `Quedan ${dias} días online`,
    lineas: [
      `La invitación de ${b(nombres)} deja de estar online el ${b(fecha.split('-').reverse().join('/'))}. Después de esa fecha el link ya no se abre.`,
      'Si quieres conservarla, puedes elegir:',
      `${b('Recuerdo en PDF · 10 €')}: una vista fija para guardar en PDF.${compradas.includes('pdf') ? ' (Ya la tienes: descárgala desde el panel.)' : ''}`,
      `${b('Página web para descargar · 25 €')}: la invitación interactiva en tu computadora, sin conexión y para siempre.${compradas.includes('web') ? ' (Ya la tienes: descárgala desde el panel.)' : ''}`,
      `${b('Permanencia online ilimitada · 30 €')}: tu mismo link, online sin fecha de vencimiento.`,
      'Precios en euros; al comprar ves el total en tu moneda. Se elige y se paga desde la pestaña «Recuerdo» de tu panel.',
    ],
    boton: 'Ver las opciones', url,
    pie: 'Si ya no la necesitas, no tienes que hacer nada.',
  }),
});

export const mailRecuerdoListo = (env, { url, producto, numero }) => ({
  subject: `Tu recuerdo está listo${numero ? ` · pedido #${numero}` : ''}`,
  ...plantilla(env, {
    titulo: '¡Listo!',
    lineas: [`Ya está activo: ${b(producto)}${numero ? ` (pedido ${b('#' + numero)})` : ''}.`, 'Lo encuentras en la pestaña «Recuerdo» de tu panel.'],
    boton: 'Abrir mi recuerdo', url,
  }),
});

export const mailCreditosVencen = (env, { empresa, lotes, dias, url, studio }) => ({
  subject: `Créditos de ${empresa} por vencer (${dias} ${dias === 1 ? 'día' : 'días'})`,
  ...plantilla(env, {
    titulo: 'Tus créditos están por vencer',
    lineas: [
      `A ${b(empresa)} le quedan créditos sin usar que vencen en ${b(`${dias} ${dias === 1 ? 'día' : 'días'}`)}:`,
      ...lotes.map((l) => `${b(`${l.restan} ${l.restan === 1 ? 'crédito' : 'créditos'}`)} · vencen el ${l.vence.slice(0, 10).split('-').reverse().join('/')}`),
      studio ? 'Con Studio, si renuevas el pase anual antes de esa fecha, los créditos que sobran se extienden 12 meses más.' : 'Úsalos publicando tus invitaciones antes de esa fecha: pasado el vencimiento se pierden.',
    ],
    boton: 'Abrir el tablero', url,
  }),
});

export const mailCompraProPagada = (env, { numero, producto, url, urlFactura }) => ({
  subject: `Pedido #${numero} confirmado`,
  ...plantilla(env, {
    titulo: 'Pago confirmado',
    lineas: [`Se confirmó el pedido #${numero}: ${b(producto)}.`, 'Ya figura en el tablero.', ...(urlFactura ? [`La factura está disponible en este link: <a href="${escapeHtml(urlFactura)}">ver o descargar</a>.`] : [])],
    boton: 'Abrir el tablero', url,
  }),
});

// README (ronda 82): mail de la consola a quien dejó una invitación sin terminar (texto editable, cupón opcional y baja)
// {nombres} en el asunto o el texto se cambia por los nombres de la invitación.
export const mailBorrador = (env, { asunto, titulo, texto, cupon, notaCupon, boton, url, nombres, baja }) => {
  const poner = (x) => String(x || '').replaceAll('{nombres}', nombres || '');
  const lineas = poner(texto).split(/\n{2,}/).map((p) => escapeHtml(p.trim()).replace(/\n/g, '<br>')).filter(Boolean);
  return {
    subject: poner(asunto),
    ...plantilla(env, { titulo: poner(titulo), lineas, boton: boton || 'Seguir con mi invitación', url,
      destacado: cupon ? { rotulo: 'Código de descuento', codigo: cupon, nota: notaCupon } : null, baja,
      pie: '¿Alguna duda? Se puede responder este mail o escribirnos por WhatsApp y les ayudamos a terminarla.' }),
  };
};
