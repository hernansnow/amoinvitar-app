// Rouge: la imagen "Nuestra Boda" / "Mis Quince Años" (y el "¡MI CUMPLE!" provisorio) pasa a ser texto con la
// fuente Mongolia Sky en bordó, así se puede traducir o cambiar. Solo si la fuente está en
// public/comun/fonts/mongolia-sky/ (MongoliaSky.woff2); si no, queda la imagen.
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const FUENTE = fileURLToPath(new URL('../../public/comun/fonts/mongolia-sky/MongoliaSky.woff2', import.meta.url));
const hay = await access(FUENTE).then(() => true, () => false);
export async function ajustar(doc, { $$, nodo }) {
  if (!hay) return;
  for (const e of $$(doc.body, 'img[src*="nuestra-boda"], img[src*="mis15"], span[style*="letter-spacing:.35em"]')) {
    e.parentNode.replaceChild(nodo(doc, '<p class="rouge-titulo mb-3 mt-2" data-t="portada.subtitulo" data-caso="titulo">Nuestra Boda</p>'), e);
  }
  if (!doc.querySelector('link[href*="mongolia-sky"]')) doc.head.insertAdjacentHTML('beforeend', '\n  <link rel="stylesheet" href="../../comun/fonts/mongolia-sky/mongolia-sky.css">');
}
