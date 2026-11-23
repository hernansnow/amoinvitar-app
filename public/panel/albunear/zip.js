// README (ronda 108): copia de public/js/zip.js de Albunear (el ZIP del álbum, armado en el navegador)
/* Descarga de todo el álbum en ZIP, armado en el navegador directamente desde el almacenamiento.
   No pasa por ningún servidor: funciona igual con 100 MB o con 30 GB. */
import { downloadZip } from './client-zip.js';

const PART_BYTES = 450 * 1024 * 1024; // sin "guardar como" (móviles, Safari): partes de ~450 MB

// README (ronda 109): cada archivo se baja entero (con 3 intentos) antes de entrar al ZIP. Antes se pasaba la respuesta
// sin leer: si la conexión se cortaba a mitad de un video, se rompía todo el ZIP y quedaba el temporal (.crswap) sin terminar.
// El ?zip=1 evita una copia en caché guardada sin los permisos CORS (la de una miniatura vista antes en la página).
async function* entries(files, progress, state) {
  for (const f of files) {
    let blob = null;
    for (let i = 0; i < 3 && !blob; i++) {
      try {
        const res = await fetch(f.url + (f.url.includes('?') ? '&' : '?') + 'zip=1', { mode: 'cors', cache: 'no-store' });
        if (res.ok) blob = await res.blob();
      } catch (e) { blob = null; }
      if (!blob) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
    state.done++;
    if (blob) yield { name: f.name, input: blob };
    else state.failed++;
    progress(state.done, state.total);
  }
}

function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
}

window.FWZip = {
  // Debe llamarse directo desde el clic (el navegador exige una acción del usuario para "Guardar como")
  async pick(zipName) {
    if (!window.showSaveFilePicker) return null;
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: zipName + '.zip', types: [{ description: 'ZIP', accept: { 'application/zip': ['.zip'] } }] });
      return handle.createWritable();
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      return null;
    }
  },

  async save(writablePromise, files, zipName, progress) {
    const state = { done: 0, failed: 0, total: files.length };
    const writable = await writablePromise;
    if (writable) {
      // Si algo falla a mitad, se descarta el archivo a medio escribir (no queda el .crswap)
      try { await downloadZip(entries(files, progress, state)).body.pipeTo(writable); }
      catch (e) { try { await writable.abort(); } catch (e2) { /* ya cerrado */ } throw e; }
      return state;
    }
    // Sin "Guardar como": se descarga en partes para no agotar la memoria del dispositivo
    const parts = [];
    let cur = [], size = 0;
    for (const f of files) {
      if (cur.length && size + (f.size || 0) > PART_BYTES) { parts.push(cur); cur = []; size = 0; }
      cur.push(f); size += f.size || 0;
    }
    if (cur.length) parts.push(cur);
    for (let i = 0; i < parts.length; i++) {
      const blob = await downloadZip(entries(parts[i], progress, state)).blob();
      saveBlob(blob, parts.length > 1 ? `${zipName}-parte-${i + 1}.zip` : `${zipName}.zip`);
    }
    return state;
  },
};
