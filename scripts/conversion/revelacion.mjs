// Revelación de género: "él/ella" y "Baby Shower" son parte del diseño (no se cambian, tampoco en el pie);
// lo que el cliente escribe es la frase de la portada y el nombre ("Dani & Marce", en un solo campo).
export async function ajustar(doc, { $$, txt }) {
  for (const e of $$(doc.body, '[data-campo-html="nombres.portada"], [data-campo-html="nombres.cierre"]').filter((x) => /^\s*él\s*\/\s*ella\s*$/i.test(txt(x)))) {
    e.removeAttribute('data-campo-html'); e.removeAttribute('data-ajustar'); e.removeAttribute('data-ajustar-pc');
  }
  for (const e of $$(doc.body, '[data-t="portada.subtitulo"]').filter((x) => /^\s*baby shower\s*$/i.test(txt(x)))) { e.removeAttribute('data-t'); e.removeAttribute('data-caso'); }
  // El nombre: el título con los nombres de la demo debajo de la frase
  for (const e of $$(doc.body, 'h1,h2').filter((x) => x.closest('#home-section') && /^\s*Dani\s*&\s*Marce\s*$/.test(txt(x)))) {
    e.setAttribute('data-campo-html', 'nombres.portada'); e.setAttribute('data-ajustar', '0.82');
  }
}
