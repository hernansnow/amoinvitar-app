// Playlist de Spotify → la lista de canciones para mostrar en la invitación.
//
// Sin claves de API: se lee la página del reproductor embebido de Spotify
// (open.spotify.com/embed/playlist/<id>), que trae los datos de la lista en un
// <script id="__NEXT_DATA__">. Se guarda en el evento al cargar el link, así la
// invitación no depende de Spotify para mostrar la lista. Si algún día Spotify
// cambia esa página, la invitación igual muestra el disco y el reproductor.

export function idPlaylist(link) {
  const m = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album)\/([A-Za-z0-9]{10,40})/.exec(String(link || ''));
  return m ? { tipo: m[1], id: m[2] } : null;
}

// Busca un arreglo "trackList" en cualquier parte del JSON
function buscar(o, clave, prof = 0) {
  if (!o || typeof o !== 'object' || prof > 12) return null;
  if (Array.isArray(o[clave])) return { lista: o[clave], padre: o };
  for (const v of Object.values(o)) { const r = buscar(v, clave, prof + 1); if (r) return r; }
  return null;
}

const minutos = (ms) => Math.round(ms / 60000);
export const duracion = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export async function leerPlaylist(link, { fetch: pedir = fetch } = {}) {
  const p = idPlaylist(link);
  if (!p) return null;
  const r = await pedir(`https://open.spotify.com/embed/${p.tipo}/${p.id}`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; AmoInvitar/2.0)', 'accept-language': 'es' } });
  if (!r.ok) return null;
  const html = await r.text();
  const m = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!m) return null;
  let datos;
  try { datos = JSON.parse(m[1]); } catch { return null; }
  const t = buscar(datos, 'trackList');
  if (!t) return null;
  const pistas = t.lista.slice(0, 50).map((x) => ({ t: String(x.title || '').slice(0, 120), a: String(x.subtitle || '').slice(0, 120), d: Number(x.duration) || 0 })).filter((x) => x.t);
  const total = t.lista.reduce((s, x) => s + (Number(x.duration) || 0), 0);
  const tapa = t.padre.coverArt?.sources?.find((x) => x.url)?.url || '';
  return {
    nombre: String(t.padre.name || t.padre.title || '').slice(0, 120),
    tapa: /^https:\/\/[a-z0-9.-]*scdn\.co\//i.test(tapa) ? tapa : '',
    pistas: pistas.map((x) => ({ ...x, d: duracion(x.d) })),
    cantidad: t.lista.length,
    minutos: minutos(total),
  };
}
