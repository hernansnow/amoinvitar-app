// README (ronda 108): copia de public/js/zip.js de Albunear (el ZIP del álbum, armado en el navegador)
/* Descarga de todo el álbum en ZIP, armado en el navegador directamente desde el almacenamiento.
   No pasa por ningún servidor: funciona igual con 100 MB o con 30 GB. */
import { downloadZip } from './client-zip.js';

const PART_BYTES = 450 * 1024 * 1024; // sin "guardar como" (móviles, Safari): partes de ~450 MB

async function* entries(files, progress, state) {
  for (const f of files) {
    let res;
    for (let i = 0; i < 3; i++) {
      try { res = await fetch(f.url); if (res.ok) break; } catch (e) { res = null; }
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
    state.done++;
    if (res && res.ok) yield { name: f.name, input: res };
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
      await downloadZip(entries(files, progress, state)).body.pipeTo(writable);
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
