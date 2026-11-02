// Hojas (ronda 23): Música va en la misma sección que el muro de Instagram (Premium) o el Álbum QR (Deluxe), y la
// conversión dejaba dos copias de la sección. Queda una sola Música: con Instagram Wall prendido, la copia con el
// muro; si no, la del álbum (y si el álbum también está apagado, Música sola). Textos y botones conectados al panel.
export async function ajustar(doc, { $$, txt }) {
  const secs = $$(doc.body, 'section.ai-sec-musica');
  const ig = secs.find((s) => s.getAttribute('data-seccion') === 'instagram');
  const al = secs.find((s) => s.getAttribute('data-seccion') === 'album');
  if (ig && al) {
    ig.removeAttribute('data-seccion'); ig.setAttribute('data-si', 'secciones.instagram');
    al.removeAttribute('data-seccion'); al.setAttribute('data-no', 'secciones.instagram');
    // En la copia del álbum, lo que va después de la línea es el álbum: se va con su sección
    const sep = $$(al, '.ai-sep-entre').pop();
    for (let x = sep?.nextElementSibling; x; x = x.nextElementSibling) x.setAttribute('data-seccion', 'album');
  }
  for (const s of secs) {
    const hA = $$(s, 'h2').find((h) => /comparte tus fotos/i.test(txt(h)) && !h.hasAttribute('data-t'));
    if (hA) { hA.setAttribute('data-t', 'album.titulo'); const p = hA.nextElementSibling; if (p?.tagName === 'P' && !p.hasAttribute('data-t-html')) p.setAttribute('data-t-html', 'album.texto'); }
    const verFotos = $$(s, 'a').find((a) => /instagram\.com\/explore/.test(a.getAttribute('href') || ''));
    if (verFotos) {
      verFotos.setAttribute('href', '#'); verFotos.setAttribute('data-attr', 'href:c:hashtag.link'); verFotos.setAttribute('data-t', 'hashtag.boton'); verFotos.setAttribute('rel', 'noopener');
      verFotos.parentElement.setAttribute('data-si', 'hashtag.link');
    }
  }
}
