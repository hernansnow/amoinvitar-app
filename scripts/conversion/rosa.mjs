// Cumpleaños infantil (desde el Baby Shower): "Baby" se va y "SHOWER" pasa a ser la frase de la portada
// ("PRIMER AÑITO", la cambia el cliente). Los demás textos son los de los infantiles.
export async function ajustar(doc, { $$, txt, evento }) {
  if (evento !== 'infantil') return;
  for (const e of $$(doc.body, 'h1,h2').filter((x) => /^\s*baby\s*$/i.test(txt(x)))) e.remove();
  for (const e of $$(doc.body, 'h1,h2,h3,h4,h5,p,span').filter((x) => /^\s*shower\s*$/i.test(txt(x)) && !x.children.length)) {
    e.setAttribute('data-t', 'portada.subtitulo'); e.removeAttribute('data-caso'); e.setAttribute('style', (e.getAttribute('style') || '').replace(/letter-spacing:\s*\d+px/, 'letter-spacing: 6px'));
  }
}
