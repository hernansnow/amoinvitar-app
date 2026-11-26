// README (ronda 87) · Lo extra de cada empresa profesional, guardado en app_state («pro-extra:<empresaId>», JSON):
//   demo        true = cuenta DEMO de Studio: arma invitaciones pero no las publica (solo las ve el dueño en vista previa)
//   habilitado  true = el profesional ve y puede comprar créditos de complementos (lo habilita el admin desde /admin)
//   saldo       { diseno: 2, idioma: 1, … } créditos de complementos disponibles (comprados o regalados por el admin)
// Los créditos de complementos se gastan al publicar (o al guardar una invitación ya publicada) con el complemento
// prendido: cada uno cubre un complemento de esa invitación (queda en datos.extras, como si se hubiera pagado).
import { getState, setState } from '../lib/verifactu.js';

// Precios sin IVA. El diseño a medida (invitación y Save The Date) se coordina con el equipo: se descuentan a mano.
export const COMPLEMENTOS_PRO = {
  diseno: { nombre: 'Cambio de diseño', neto: 17 },
  idioma: { nombre: 'Idioma adicional (cada idioma)', neto: 6 },
  agradecimiento: { nombre: 'Tarjeta de agradecimiento', neto: 13 },
  'std-tarjeta': { nombre: 'Save The Date · tarjeta', neto: 5 },
  'std-foto': { nombre: 'Save The Date · foto', neto: 13 },
  'std-web': { nombre: 'Save The Date · web', neto: 18 },
  'a-medida': { nombre: 'Diseño a medida · invitación web', neto: 120, manual: true },
  'std-web-medida': { nombre: 'Diseño a medida · Save The Date web', neto: 50 },
  'std-tarjeta-medida': { nombre: 'Diseño a medida · Save The Date tarjeta', neto: 30 },
};
// Los complementos que se prenden en el panel del evento y el crédito que los cubre
export const COMPLEMENTO_DE_CREDITO = ['diseno', 'idioma', 'agradecimiento', 'std-tarjeta', 'std-foto', 'std-web', 'std-web-medida', 'std-tarjeta-medida'];

const clave = (id) => `pro-extra:${id}`;
export async function extrasDe(env, empresaId) {
  if (!empresaId) return { demo: false, habilitado: false, saldo: {} };
  let x = {};
  try { x = JSON.parse((await getState(env, clave(empresaId))) || '{}') || {}; } catch { x = {}; }
  return { demo: !!x.demo, previo: x.previo || null, habilitado: !!x.habilitado, saldo: x.saldo && typeof x.saldo === 'object' ? x.saldo : {}, historial: Array.isArray(x.historial) ? x.historial : [],
    duo: x.duo && typeof x.duo === 'object' ? x.duo : {} }; // README (ronda 122)
}
async function guardar(env, empresaId, x) {
  await setState(env, clave(empresaId), JSON.stringify({ ...x, historial: (x.historial || []).slice(-60) }));
}
export async function cambiarExtras(env, empresaId, cambios) {
  const x = await extrasDe(env, empresaId);
  for (const k of ['demo', 'habilitado']) if (k in cambios) x[k] = !!cambios[k];
  if ('previo' in cambios) x.previo = cambios.previo || null; // README (ronda 88): nivel y pase de antes de la DEMO
  await guardar(env, empresaId, x);
  return x;
}
// Suma (o resta, con cantidad negativa) créditos de un complemento. origen: 'regalo' | 'compra' | 'uso' | 'ajuste'
export async function sumarSaldo(env, empresaId, item, cantidad, origen, nota = '') {
  if (!COMPLEMENTOS_PRO[item]) throw new Error('Complemento desconocido');
  const x = await extrasDe(env, empresaId);
  x.saldo[item] = Math.max(0, (parseInt(x.saldo[item], 10) || 0) + cantidad);
  x.historial.push({ f: new Date().toISOString(), item, cantidad, origen, nota: String(nota || '').slice(0, 120) });
  await guardar(env, empresaId, x);
  return x;
}
// Cubre con créditos de complementos los complementos sin pagar de la invitación (ids de plan.aPagar.extras).
// Devuelve { cubiertos: [...], faltan: [...] }. Solo descuenta si alcanza para todos (todo o nada).
export async function cubrirComplementos(env, ev, sinPagar) {
  const lista = (sinPagar || []).filter((x) => COMPLEMENTO_DE_CREDITO.includes(x));
  if (!lista.length || !ev.empresaId) return { cubiertos: [], faltan: sinPagar || [] };
  const x = await extrasDe(env, ev.empresaId);
  const pide = {};
  lista.forEach((k) => { pide[k] = (pide[k] || 0) + 1; });
  const faltan = Object.entries(pide).filter(([k, n]) => (parseInt(x.saldo[k], 10) || 0) < n).map(([k]) => k);
  const otros = (sinPagar || []).filter((k) => !COMPLEMENTO_DE_CREDITO.includes(k));
  if (faltan.length || otros.length) return { cubiertos: [], faltan: [...faltan, ...otros] };
  for (const [k, n] of Object.entries(pide)) {
    x.saldo[k] = (parseInt(x.saldo[k], 10) || 0) - n;
    x.historial.push({ f: new Date().toISOString(), item: k, cantidad: -n, origen: 'uso', nota: ev.id });
  }
  await guardar(env, ev.empresaId, x);
  return { cubiertos: lista, faltan: [] };
}

// ── README (ronda 122): Duo = invitación Deluxe Pro + álbum QR Platinum Pro (Albunear, sin nombrarlo al cliente) ──
//   duo.saldo        créditos Duo disponibles (cada uno publica una invitación con su álbum)
//   duo.paseVence    pase anual Event Studio Duo (incluye Studio): habilita los packs Duo de 10 a 100
// Se guardan en el mismo app_state que los complementos. Al publicar un evento con «Duo» se gasta uno.
export async function sumarDuo(env, empresaId, cantidad, origen, nota = '') {
  const x = await extrasDe(env, empresaId);
  const duo = x.duo || {};
  duo.saldo = Math.max(0, (parseInt(duo.saldo, 10) || 0) + cantidad);
  x.duo = duo;
  x.historial.push({ f: new Date().toISOString(), item: 'duo', cantidad, origen, nota: String(nota || '').slice(0, 120) });
  await guardar(env, empresaId, x);
  return x;
}
export async function usarDuo(env, empresaId, nota = '') {
  const x = await extrasDe(env, empresaId);
  if (!((parseInt(x.duo?.saldo, 10) || 0) > 0)) return false;
  await sumarDuo(env, empresaId, -1, 'uso', nota);
  return true;
}
export async function paseDuo(env, empresaId, vence) {
  const x = await extrasDe(env, empresaId);
  x.duo = { ...(x.duo || {}), paseVence: vence };
  await guardar(env, empresaId, x);
  return x;
}
export const duoVigente = (x) => !!(x?.duo?.paseVence && x.duo.paseVence >= new Date().toISOString());
