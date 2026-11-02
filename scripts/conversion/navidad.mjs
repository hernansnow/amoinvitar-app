// Navidad (ronda 23): "Familia o nombre" del panel se ve como firma del texto inicial (la letra del título
// "Felices Fiestas", más chica; queda aunque se apague el texto) y en el cierre, en lugar de "Fiesta de Navidad".
export async function ajustar(doc, { $$, txt, nodo, despues }) {
  for (const sec of $$(doc.body, 'section#portfolio')) {
    const titulo = $$(sec, 'h2').find((h) => /felices fiestas/i.test(txt(h)));
    if (!titulo) continue;
    const texto = $$(sec, 'h4.g-historia')[0];
    const firma = nodo(doc, '<p class="amsterdam-four-font text-bordo ai-firma mb-0 mt-3" data-campo="nombres.a">Familia Pérez</p>');
    despues(texto || titulo, firma);
  }
  for (const h of $$(doc.body, 'h1,h2,h3').filter((x) => /^\s*fiesta de navidad\s*$/i.test(txt(x)) && !x.hasAttribute('data-t'))) {
    h.setAttribute('data-campo', 'nombres.a');
  }
}
