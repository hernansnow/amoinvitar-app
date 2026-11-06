// README (ronda 31) · Formulario de contacto, hecho de cero para la web nueva (reemplaza a email/mailer2.php y a los
// mailer*.php de cada país). Todas las páginas usan el mismo:
//
//   POST /api/contacto     (JSON o formulario)  → { ok: true }  ·  error: { error: "…" } con 400 / 429
//   Campos: nombre*, email*, telefono, evento, pais, mensaje*, privacidad* ("si"/true),
//           cf-turnstile-response (si TURNSTILE_SECRET está configurado), sitio_web (trampa: vacío), desde (ms al abrir)
//
// En la página: <form data-contacto> con esos nombres y <script src="/comun/js/contacto.js" defer></script>
// (ver el ejemplo en public/comun/js/contacto.js). El mail llega a SUPPORT_EMAIL con "responder a" el del cliente.
// Antispam: Turnstile (secreto TURNSTILE_SECRET; la clave pública va en data-turnstile del form), campo trampa,
// tiempo mínimo de 3 s entre abrir y enviar, y 5 envíos cada 10 minutos por IP (LIMITE_PIN).
import { json, HttpError } from '../lib/util.js';
import { sendEmail, mailAvisoInterno } from '../lib/email.js';
import { asegurarTablasPro } from '../pro/esquema.js';
import { randomId } from '../lib/util.js';

const linea = (v, max = 200) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Lee JSON o formulario (también el de las páginas viejas: user_email, phone, country, acepto_privacidad)
export async function leerContacto(request) {
  const tipo = request.headers.get('content-type') || '';
  let d = {};
  if (tipo.includes('application/json')) d = await request.json().catch(() => ({}));
  else { const f = await request.formData().catch(() => null); if (f) for (const [k, v] of f.entries()) d[k] = typeof v === 'string' ? v : ''; }
  return {
    nombre: linea(d.nombre, 100), email: linea(d.email || d.user_email, 150), telefono: linea(d.telefono || d.phone, 40),
    evento: linea(d.evento, 60), pais: linea(d.pais || d.country, 60), mensaje: String(d.mensaje ?? '').trim().slice(0, 5000),
    privacidad: d.privacidad === true || d.privacidad === 'si' || d.acepto_privacidad === 'si',
    turnstile: String(d['cf-turnstile-response'] || ''), trampa: String(d.sitio_web || d.contact_code || d.wf_b3 || ''),
    desde: Number(d.desde || d.form_time || 0), pagina: linea(d.pagina, 300),
  };
}

// Valida y manda el mail. Devuelve { ok } o lanza HttpError con el motivo (en español neutro, para mostrarlo)
export async function procesarContacto(env, request, c) {
  if (c.trampa) return { ok: true, robot: true }; // los robots completan el campo oculto: se les dice que sí y no se manda
  if (c.desde && Date.now() - c.desde < 3000) throw new HttpError(400, 'Espera unos segundos y vuelve a enviarlo.');
  if (env.LIMITE_PIN) {
    const { success } = await env.LIMITE_PIN.limit({ key: `contacto:${request.headers.get('cf-connecting-ip') || ''}` });
    if (!success) throw new HttpError(429, 'Recibimos varios mensajes seguidos. Prueba de nuevo en unos minutos.');
  }
  if (env.TURNSTILE_SECRET) {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: c.turnstile, remoteip: request.headers.get('cf-connecting-ip') || '' }) })
      .then((x) => x.json()).catch(() => ({ success: false }));
    if (!r.success) throw new HttpError(400, 'No pudimos verificar que no eres un robot. Vuelve a intentarlo.');
  }
  if (!c.nombre) throw new HttpError(400, 'Falta tu nombre.');
  if (!MAIL.test(c.email)) throw new HttpError(400, 'El mail no parece válido.');
  if (!c.mensaje) throw new HttpError(400, 'Falta el mensaje.');
  if (!c.privacidad) throw new HttpError(400, 'Para enviarlo hay que aceptar la política de privacidad.');
  const pagina = c.pagina || request.headers.get('referer') || '';
  // README (ronda 35): queda guardado para verlo en /admin además del mail
  try {
    await asegurarTablasPro(env);
    await env.DB.prepare('INSERT INTO consultas (id, nombre, email, telefono, evento, pais, mensaje, pagina, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('cn_' + randomId(6), c.nombre, c.email, c.telefono || null, c.evento || null, c.pais || null, c.mensaje, pagina || null, new Date().toISOString()).run();
  } catch (e) { console.error('[consulta]', e); }
  await sendEmail(env, { to: env.SUPPORT_EMAIL || 'hola@amoinvitar.com', replyTo: c.email, ...mailAvisoInterno(env, {
    asunto: `Contacto web · ${c.nombre}${c.evento ? ` · ${c.evento}` : ''}`,
    lineas: [`Nombre: ${c.nombre}`, `Mail: ${c.email}`, c.telefono ? `Teléfono: ${c.telefono}` : '', c.evento ? `Evento: ${c.evento}` : '', c.pais ? `País: ${c.pais}` : '',
      pagina ? `Página: ${pagina}` : '', '', c.mensaje].filter((x, i, a) => x !== '' || (i > 0 && a[i - 1] !== '')),
  }) });
  return { ok: true };
}

export async function contacto(request, env) {
  return json(await procesarContacto(env, request, await leerContacto(request)));
}
