// Link de Google Maps → lo que necesita el mapa embebido.
//
// El cliente pega el link que le da Google Maps al tocar "Compartir"
// (https://maps.app.goo.gl/…) o el de la barra del navegador
// (https://www.google.com/maps/place/…/@-34.6,-58.4,17z/data=…!3d-34.6!4d-58.4).
// Los cortos no traen datos: se pide el link sin seguir la redirección y se lee
// a dónde manda (cabecera Location). De la dirección larga salen las coordenadas
// exactas del lugar (!3d…!4d…), las del centro del mapa (@lat,lng) o lo buscado.

const CORTOS = /(^|\.)(maps\.app\.goo\.gl|goo\.gl|g\.co)$/i;
const GOOGLE = /(^|\.)google\.[a-z.]+$/i;

const num = (x) => Number.parseFloat(x);
const coordsOk = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
const limpiar = (s) => decodeURIComponent(String(s || '').replace(/\+/g, ' ')).replace(/\s+/g, ' ').trim();

// Saca { lat, lng, nombre, consulta } de una dirección larga de Google Maps
export function leerLinkMaps(link) {
  let u;
  try { u = new URL(link); } catch { return null; }
  if (!GOOGLE.test(u.hostname) && !/^maps\.google\./i.test(u.hostname)) return null;
  const todo = decodeURIComponent(u.pathname + u.search + u.hash);
  const r = {};
  // Coordenadas del lugar marcado (las más precisas)
  const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(todo);
  if (pin && coordsOk(num(pin[1]), num(pin[2]))) { r.lat = num(pin[1]); r.lng = num(pin[2]); }
  // Nombre del lugar: /maps/place/<nombre>/
  const lugar = /\/maps\/place\/([^/@]+)/.exec(u.pathname);
  if (lugar) r.nombre = limpiar(lugar[1]);
  // Búsqueda: /maps/search/<texto>/ · ?q= · ?query= · ?daddr= (cómo llegar)
  const busqueda = /\/maps\/search\/([^/@]+)/.exec(u.pathname);
  const q = u.searchParams.get('q') || u.searchParams.get('query') || u.searchParams.get('daddr') || (busqueda && busqueda[1]);
  if (q) {
    const c = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(limpiar(q));
    if (c && coordsOk(num(c[1]), num(c[2])) && r.lat == null) { r.lat = num(c[1]); r.lng = num(c[2]); } else if (!c) r.consulta = limpiar(q);
  }
  // Centro del mapa (@lat,lng,zoom): si no hubo nada mejor es el lugar; si hay nombre, ayuda a ubicarlo
  const centro = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(u.pathname);
  if (centro && coordsOk(num(centro[1]), num(centro[2]))) {
    if (r.lat == null && !r.consulta && !r.nombre) { r.lat = num(centro[1]); r.lng = num(centro[2]); } else if (r.lat == null) r.cerca = `${num(centro[1])},${num(centro[2])}`;
  }
  return Object.keys(r).length ? r : null;
}

// Lo que va en ?q= del mapa embebido
export function consultaMapa(d) {
  if (!d) return '';
  if (d.lat != null) return `${d.lat},${d.lng}`;
  return d.consulta || d.nombre || '';
}

// Resuelve un link (corto o largo). Devuelve { q, link } o null si no se pudo.
export async function resolverMapa(link, { fetch: pedir = fetch } = {}) {
  let actual = String(link || '').trim();
  if (!/^https?:\/\//i.test(actual)) return null;
  for (let saltos = 0; saltos < 4; saltos++) {
    let u;
    try { u = new URL(actual); } catch { return null; }
    if (!CORTOS.test(u.hostname)) break;
    try {
      const r = await pedir(actual, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 (compatible; AmoInvitar/2.0)' } });
      const destino = r.headers.get('location');
      if (!destino) break;
      actual = new URL(destino, actual).href;
    } catch { return null; }
  }
  const d = leerLinkMaps(actual);
  const q = consultaMapa(d);
  return q ? { q, ...(d.cerca ? { ll: d.cerca } : {}), link: actual } : null;
}

// Mapa embebido de Google (sin clave de API)
export function embedMapa({ q, ll } = {}) {
  if (!q) return '';
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}${ll ? `&ll=${ll}` : ''}&z=16&output=embed`;
}
