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

function plantilla(env, { titulo, lineas, boton, url, pie }) {
  const s = sitio(env);
  const html = `<!doctype html><html><body style="margin:0;background:#f1efe9;font-family:Helvetica,Arial,sans-serif;color:#1f2421">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:18px;padding:36px 32px">
<tr><td style="padding-bottom:22px"><img src="${s}/comun/img/amoinvitar-email.png" width="150" height="32" alt="Amo Invitar!" style="display:block;border:0"></td></tr>
<tr><td style="font-size:22px;font-weight:bold;padding-bottom:12px">${escapeHtml(titulo)}</td></tr>
${lineas.map((l) => `<tr><td style="font-size:16px;line-height:1.55;padding-bottom:12px">${l}</td></tr>`).join('')}
${boton ? `<tr><td style="padding:12px 0 22px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#7a9c7e;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px">${escapeHtml(boton)}</a></td></tr>
<tr><td style="font-size:13px;color:#6b706c;line-height:1.5;padding-bottom:12px">Si el botón no funciona, copiar este link en el navegador:<br><a href="${escapeHtml(url)}" style="color:#4e9c87;word-break:break-all">${escapeHtml(url)}</a></td></tr>` : ''}
${pie ? `<tr><td style="font-size:13px;color:#6b706c;padding-bottom:12px">${pie}</td></tr>` : ''}
<tr><td style="font-size:13px;color:#6b706c;border-top:1px solid #f1efe9;padding-top:16px">El equipo de Amo Invitar!<br>${escapeHtml(env.SUPPORT_EMAIL || 'hola@amoinvitar.com')}</td></tr>
</table></td></tr></table></body></html>`;
  const quitar = (x) => x.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const text = [titulo, '', ...lineas.map(quitar), '', boton ? `${boton}: ${url}` : '', pie ? quitar(pie) : '', '', 'El equipo de Amo Invitar!'].join('\n');
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

export const mailCompraProPagada = (env, { numero, producto, url, urlFactura }) => ({
  subject: `Pedido #${numero} confirmado`,
  ...plantilla(env, {
    titulo: 'Pago confirmado',
    lineas: [`Se confirmó el pedido #${numero}: ${b(producto)}.`, 'Ya figura en el tablero.', ...(urlFactura ? [`La factura está disponible en este link: <a href="${escapeHtml(urlFactura)}">ver o descargar</a>.`] : [])],
    boton: 'Abrir el tablero', url,
  }),
});
