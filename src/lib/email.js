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
  const quitar = (x) => x.replace(/<[^>]+>/g, '');
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
