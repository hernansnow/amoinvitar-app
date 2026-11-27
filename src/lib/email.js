// Mails con Resend (https://resend.com). Sin RESEND_API_KEY (pruebas), el mail se muestra en la consola.
// Los textos evitan el tú y el vos para que sirvan igual en todos los países.
import { escapeHtml } from './util.js';
import { TEXTOS_MAIL, FIJOS_MAIL, productoEn } from './email-textos.js';
import { lenguaMail } from './idioma-mail.js';

export async function sendEmail(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) {
    console.log(`[mail] Para: ${to}\nAsunto: ${subject}\n${text}\n`);
    env.ULTIMOS_MAILS?.push({ to, subject, text, html });
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
// README (ronda 118): lineasDespues (párrafos debajo del cupón) y boton2 { texto, url } (segundo botón, de contorno)
export function plantilla(env, { titulo, lineas, boton, url, pie, destacado, baja, fijos = {}, lineasDespues = [], boton2 = null }) {
  const F = { botonNo: 'Si el botón no funciona, copiar este link en el navegador:', firma: 'El equipo de Amo Invitar!', baja: 'Si no se quieren recibir más mails como este:', bajaLink: 'darse de baja', bajaTexto: 'Para no recibir más mails como este:', ...fijos };
  lineas = (lineas || []).map(enlaces); lineasDespues = (lineasDespues || []).map(enlaces); pie = pie ? enlaces(pie) : pie;
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
${lineasDespues.map((l) => `<tr><td style="font-size:16px;line-height:1.55;padding-bottom:12px">${l}</td></tr>`).join('')}
${boton ? `<tr><td style="padding:12px 0 22px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#4e9c87;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 28px;border-radius:999px;margin:0 8px 8px 0">${escapeHtml(boton)}</a>${boton2 ? `<a href="${escapeHtml(boton2.url)}" style="display:inline-block;background:#ffffff;color:#2f6f5f;border:2px solid #4e9c87;text-decoration:none;font-weight:bold;padding:12px 26px;border-radius:999px;margin:0 0 8px">${escapeHtml(boton2.texto)}</a>` : ''}</td></tr>
<tr><td style="font-size:13px;color:#6b706c;line-height:1.5;padding-bottom:12px">${escapeHtml(F.botonNo)}<br><a href="${escapeHtml(url)}" style="color:#4e9c87;word-break:break-all">${escapeHtml(url)}</a></td></tr>` : ''}
${pie ? `<tr><td style="font-size:13px;color:#6b706c;padding-bottom:12px">${pie}</td></tr>` : ''}
<tr><td style="font-size:13px;color:#6b706c;border-top:1px solid #f1efe9;padding-top:16px">${escapeHtml(F.firma)}<br>${escapeHtml(env.SUPPORT_EMAIL || 'hola@amoinvitar.com')}</td></tr>
</table>${baja ? `<p style="font-size:12px;color:#8a8f8b;margin:14px 0 0">${escapeHtml(F.baja)} <a href="${escapeHtml(baja)}" style="color:#8a8f8b">${escapeHtml(F.bajaLink)}</a>.</p>` : ''}</td></tr></table></body></html>`;
  const quitar = (x) => x.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const text = [titulo, '', ...lineas.map(quitar), destacado ? `\n${destacado.rotulo}: ${destacado.codigo}${destacado.nota ? ` (${destacado.nota})` : ''}\n` : '', ...lineasDespues.map(quitar), boton ? `${boton}: ${url}` : '', boton2 ? `${boton2.texto}: ${boton2.url}` : '', pie ? quitar(pie) : '', '', F.firma, baja ? `\n${F.bajaTexto} ${baja}` : ''].join('\n');
  return { html, text };
}

const b = (s) => `<b>${escapeHtml(s)}</b>`;
// README (ronda 118): todos los mails a clientes y profesionales van en su idioma (idioma: es, en, pt, fr, it, de, nl; ver
// src/lib/idioma-mail.js). T(idioma) → textos; poner('… {x} …', { x }) reemplaza los datos (ya escapados o en negrita).
const T = (idioma) => TEXTOS_MAIL[lenguaMail(idioma)];
const fijosDe = (idioma) => FIJOS_MAIL[lenguaMail(idioma)];
const poner = (t, v = {}) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
const fechaDMY = (f) => String(f || '').slice(0, 10).split('-').reverse().join('/');

export const mailAcceso = (env, url, idioma) => {
  const L = T(idioma).acceso;
  return { subject: L.asunto, ...plantilla(env, { titulo: L.titulo, lineas: [escapeHtml(L.linea)], boton: L.boton, url, pie: escapeHtml(L.pie), fijos: fijosDe(idioma) }) };
};

export const mailPedidoListo = (env, { url, producto, numero, gratis, idioma }) => {
  producto = productoEn(producto, lenguaMail(idioma)); // README (ronda 118)
  const L = T(idioma).pedido;
  return {
    subject: gratis ? L.asuntoGratis : poner(L.asuntoPago, { n: numero }),
    ...plantilla(env, {
      titulo: gratis ? L.tituloGratis : L.tituloPago,
      lineas: [`${escapeHtml(gratis ? L.creada : L.activa)}: ${b(producto)}${numero ? ` (${escapeHtml(L.pedido)} ${b('#' + numero)})` : ''}.`, escapeHtml(L.linea2)],
      boton: L.boton, url, pie: escapeHtml(L.pie), fijos: fijosDe(idioma),
    }),
  };
};

export const mailTransferencia = (env, { url, producto, numero, importe, datos, idioma }) => {
  producto = productoEn(producto, lenguaMail(idioma)); // README (ronda 118)
  const L = T(idioma).transferencia;
  return {
    subject: poner(L.asunto, { n: numero }),
    ...plantilla(env, {
      titulo: L.titulo,
      lineas: [
        poner(escapeHtml(L.linea1), { n: b('#' + numero), p: b(producto), i: b(importe) }),
        `<pre style="font-family:inherit;white-space:pre-wrap;background:#f6f5f3;border-radius:10px;padding:12px;margin:0">${escapeHtml(datos)}</pre>`,
        poner(escapeHtml(L.linea3), { c: b(poner(L.concepto, { n: numero })) }),
      ],
      boton: L.boton, url, fijos: fijosDe(idioma),
    }),
  };
};

export const mailAvisoInterno = (env, { asunto, lineas }) => ({
  subject: asunto,
  ...plantilla(env, { titulo: asunto, lineas: lineas.map(escapeHtml) }),
});

export const mailFactura = (env, { url, numero, producto, idioma }) => {
  producto = productoEn(producto, lenguaMail(idioma)); // README (ronda 118)
  const L = T(idioma).factura;
  return { subject: poner(L.asunto, { n: numero }), ...plantilla(env, { titulo: L.titulo, lineas: [poner(escapeHtml(L.linea1), { n: b(numero), p: b(producto) }), escapeHtml(L.linea2)], boton: L.boton, url, fijos: fijosDe(idioma) }) };
};

// Aviso a los dueños antes del cierre de la confirmación (lo manda la tarea diaria)
export const mailAvisoCierre = (env, { nombres, dias, sinResponder, noAbrieron, url, idioma }) => {
  const L = T(idioma).cierre;
  // «{quien}» = «N invitados que no respondieron» + «(K ni siquiera abrieron su link)»
  const quien = poner(escapeHtml(sinResponder === 1 ? L.uno : L.varios), { s: b(String(sinResponder)) })
    + (noAbrieron ? escapeHtml(poner(noAbrieron === 1 ? L.noAbrio1 : L.noAbrio, { k: noAbrieron })) : '');
  return {
    subject: poner(dias === 1 ? L.asunto1 : L.asunto, { d: dias, s: sinResponder }),
    ...plantilla(env, {
      titulo: poner(dias === 1 ? L.titulo1 : L.titulo, { d: dias }),
      lineas: [poner(escapeHtml(L.linea1), { x: b(nombres), s: b(String(sinResponder)), quien }), escapeHtml(L.linea2)],
      boton: L.boton, url, pie: escapeHtml(L.pie), fijos: fijosDe(idioma),
    }),
  };
};

// Respuestas nuevas de la confirmación (una sola o el resumen del día)
export const mailRespuestas = (env, { nombres, respuestas, url, resumen = false, tope = false, idioma }) => {
  const L = T(idioma).respuestas;
  const si = respuestas.filter((r) => r.asiste).length, no = respuestas.length - si;
  const uno = respuestas.length === 1 && !resumen ? respuestas[0] : null;
  const linea = (r) => `${r.asiste ? '✅' : '❌'} ${b(r.nombre)}${r.asiste && /^\d+$/.test(String(r.personas || '')) && Number(r.personas) > 1 ? ` (${escapeHtml(poner(L.personas, { k: r.personas }))})` : ''}${r.mensaje ? ` <br><span style="color:#6b706c">“${escapeHtml(r.mensaje)}”</span>` : ''}`;
  return {
    subject: uno ? `${uno.asiste ? L.si : L.no}: ${uno.nombre} · ${nombres}` : poner(L.asuntoVarias, { k: respuestas.length, x: nombres }),
    ...plantilla(env, {
      titulo: uno ? poner(L.tituloUno, { x: nombres }) : L.tituloVarias,
      lineas: [
        ...(uno ? [] : [poner(escapeHtml(L.resumen), { x: b(nombres), si: b(String(si)), no: b(String(no)), confirmaron: escapeHtml(si === 1 ? L.confirmo1 : L.confirmaron), noVan: escapeHtml(no === 1 ? L.noVa1 : L.noVan) })]),
        ...respuestas.slice(0, 40).map(linea),
        ...(respuestas.length > 40 ? [escapeHtml(poner(L.mas, { k: respuestas.length - 40 }))] : []),
        ...(tope ? [escapeHtml(L.tope)] : []),
      ],
      boton: L.boton, url, pie: escapeHtml(L.pie), fijos: fijosDe(idioma),
    }),
  };
};

// Le dieron acceso a una invitación (la pareja o un administrador: wedding planner, organizador…)
export const mailNuevoAcceso = (env, { nombres, rol, url, quien, idioma }) => {
  const L = T(idioma).nuevoAcceso, n = nombres || L.laInvitacion;
  return {
    subject: poner(L.asunto, { x: n }),
    ...plantilla(env, {
      titulo: poner(L.asunto, { x: n }),
      lineas: [poner(escapeHtml(L.linea1), { quien: quien ? poner(escapeHtml(L.dio), { q: b(quien) }) : escapeHtml(L.seDio), para: escapeHtml(rol === 'pareja' ? L.pareja : L.admin) }), escapeHtml(L.linea2)],
      boton: L.boton, url, fijos: fijosDe(idioma),
    }),
  };
};

// README (ronda 28): diseño a medida. El equipo lo aprueba y el cliente paga para que empiece el diseño
export const mailMedidaAprobada = (env, { url, nombres, idioma }) => {
  const L = T(idioma).medida;
  return { subject: L.asunto, ...plantilla(env, { titulo: L.titulo, lineas: [poner(escapeHtml(L.linea1), { de: nombres ? poner(escapeHtml(L.de), { x: b(nombres) }) : '' }), escapeHtml(L.linea2)], boton: L.boton, url, fijos: fijosDe(idioma) }) };
};

// README (ronda 33) · Cuentas profesionales
export const mailSolicitudProRecibida = (env, { nombre, idioma }) => {
  const L = T(idioma).proSolicitud;
  return { subject: L.asunto, ...plantilla(env, { titulo: L.titulo, lineas: [poner(escapeHtml(L.linea1), { nom: nombre ? `, ${b(nombre)}` : '' }), escapeHtml(L.linea2)], fijos: fijosDe(idioma) }) };
};

export const mailProAprobada = (env, { nombre, nivel, url, idioma }) => {
  const L = T(idioma).proAprobada;
  return {
    subject: L.asunto,
    ...plantilla(env, {
      titulo: L.titulo, lineas: [poner(escapeHtml(L.linea1), { nom: nombre ? `${b(nombre)}: ` : '', nivel: b(nivel) }).replace(/^(.)/, (c) => c.toUpperCase()), escapeHtml(L.linea2)],
      // README (ronda 87): el botón lleva directo al tablero profesional (entra con el mail y vuelve a /empresa/)
      boton: L.boton, url: `${String(url || '').replace(/\/$/, '')}/entrar?siguiente=/empresa/`, fijos: fijosDe(idioma),
    }),
  };
};

export const mailProRechazada = (env, { nombre, motivo, idioma }) => {
  const L = T(idioma).proRechazada;
  return { subject: L.asunto, ...plantilla(env, { titulo: L.titulo, lineas: [poner(escapeHtml(L.linea1), { nom: nombre ? `, ${b(nombre)}` : '' }), ...(motivo ? [escapeHtml(motivo)] : []), escapeHtml(L.linea2)], fijos: fijosDe(idioma) }) };
};

// README (ronda 35) · Tablero profesional
export const mailEquipoPro = (env, { empresa, quien, url, idioma }) => {
  const L = T(idioma).proEquipo;
  return { subject: poner(L.asunto, { e: empresa }), ...plantilla(env, { titulo: poner(L.titulo, { e: empresa }), lineas: [poner(escapeHtml(L.linea1), { q: b(quien), e: b(empresa) }), escapeHtml(L.linea2)], boton: L.boton, url, fijos: fijosDe(idioma) }) };
};

export const mailCompraPro = (env, { numero, producto, total, referencia, datos, idioma }) => {
  producto = productoEn(producto, lenguaMail(idioma)); // README (ronda 118)
  const L = T(idioma).proCompra;
  return {
    subject: `${poner(L.titulo, { n: numero })} · ${producto}`,
    ...plantilla(env, {
      titulo: poner(L.titulo, { n: numero }),
      lineas: [b(producto), poner(escapeHtml(L.importe), { t: b(total) }), poner(escapeHtml(L.referencia), { r: b(referencia) }), ...(datos ? [`${escapeHtml(L.datos)}<br>${escapeHtml(datos).replace(/\n/g, '<br>')}`] : [escapeHtml(L.sinDatos)]), escapeHtml(L.linea)],
      fijos: fijosDe(idioma),
    }),
  };
};

export const mailRecuerdoVence = (env, { nombres, dias, fecha, url, compradas = [], idioma }) => {
  const L = T(idioma).recuerdoVence;
  const op = (k) => poner(escapeHtml(L[k]), { t: b(L['t' + k]) }) + (compradas.includes(k) ? escapeHtml(L.ya) : '');
  return {
    subject: poner(dias <= 1 ? L.asunto1 : L.asunto, { x: nombres, d: dias }),
    ...plantilla(env, {
      titulo: poner(dias <= 1 ? L.titulo1 : L.titulo, { d: dias }),
      lineas: [poner(escapeHtml(L.linea1), { x: b(nombres), f: b(fechaDMY(fecha)) }), escapeHtml(L.linea2), op('pdf'), op('web'), poner(escapeHtml(L.online), { t: b(L.tonline) }), escapeHtml(L.precios)],
      boton: L.boton, url, pie: escapeHtml(L.pie), fijos: fijosDe(idioma),
    }),
  };
};

export const mailRecuerdoListo = (env, { url, producto, numero, idioma }) => {
  producto = productoEn(producto, lenguaMail(idioma)); // README (ronda 118)
  const L = T(idioma).recuerdoListo;
  return {
    subject: numero ? poner(L.asuntoN, { n: numero }) : L.asunto,
    ...plantilla(env, { titulo: L.titulo, lineas: [poner(escapeHtml(L.linea1), { p: b(producto), pn: numero ? poner(escapeHtml(L.pn), { n: b('#' + numero) }) : '' }), escapeHtml(L.linea2)], boton: L.boton, url, fijos: fijosDe(idioma) }),
  };
};

// README (ronda 118): pago de un cobro adicional (antes iba con el aviso interno, en español)
export const mailAdicionalPagado = (env, { titulo, detalle, idioma }) => {
  const L = T(idioma).adicional;
  return { subject: titulo, ...plantilla(env, { titulo, lineas: [escapeHtml(poner(L.linea1, { t: titulo })), ...(detalle ? [b(`${titulo} · ${detalle}`)] : []), escapeHtml(L.linea2)], fijos: fijosDe(idioma) }) };
};

export const mailCreditosVencen = (env, { empresa, lotes, dias, url, studio, idioma }) => {
  const L = T(idioma).proCreditos;
  const d = poner(dias === 1 ? L.dia : L.dias, { k: dias });
  return {
    subject: poner(L.asunto, { e: empresa, d }),
    ...plantilla(env, {
      titulo: L.titulo,
      lineas: [
        poner(escapeHtml(L.linea1), { e: b(empresa), d: b(d) }),
        ...lotes.map((l) => `${b(poner(l.restan === 1 ? L.credito : L.creditos, { k: l.restan }))} · ${escapeHtml(poner(L.vencen, { f: fechaDMY(l.vence) }))}`),
        escapeHtml(studio ? L.studio : L.pro),
      ],
      boton: L.boton, url, fijos: fijosDe(idioma),
    }),
  };
};

// README (ronda 129): el pase anual Studio o Event Studio Duo vence en un mes
export const mailPaseVence = (env, { empresa, pase, vence, dias, url, idioma }) => {
  const L = T(idioma).proPase;
  const d = poner(dias === 1 ? L.dia : L.dias, { k: dias });
  return {
    subject: poner(L.asunto, { e: empresa, p: pase, d }),
    ...plantilla(env, { titulo: L.titulo, lineas: [poner(escapeHtml(L.linea1), { p: b(pase), e: b(empresa), f: b(fechaDMY(vence)), d }), escapeHtml(L.linea2)], boton: L.boton, url, fijos: fijosDe(idioma) }),
  };
};

export const mailCompraProPagada = (env, { numero, producto, url, urlFactura, idioma }) => {
  producto = productoEn(producto, lenguaMail(idioma)); // README (ronda 118)
  const L = T(idioma).proPagada;
  return {
    subject: poner(L.asunto, { n: numero }),
    ...plantilla(env, {
      titulo: L.titulo,
      lineas: [poner(escapeHtml(L.linea1), { n: numero, p: b(producto) }), escapeHtml(L.linea2), ...(urlFactura ? [poner(escapeHtml(L.factura), { a: `<a href="${escapeHtml(urlFactura)}">${escapeHtml(L.verFactura)}</a>` })] : [])],
      boton: L.boton, url, fijos: fijosDe(idioma),
    }),
  };
};

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
