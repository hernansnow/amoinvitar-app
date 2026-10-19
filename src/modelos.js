// Modelos que se venden en la tienda. Cada uno tiene su carpeta en public/modelos/<id>/
// (index.html, modelo.json, tema.css, estilo.css, img/ y demo/).
// Cuando un diseño se separa por tipo de evento (por ejemplo "aquarella-bautismo"),
// se suma acá como un modelo más con un solo tipo de evento.

export const MODELOS = [
  // PROVISORIO: Garden con plan gratis para poder probarlo hasta convertir los modelos gratis
  // (Oliva, Armonía, White, Minimal, Floral). Antes del lanzamiento: gratis: false.
  { id: 'garden', nombre: 'Garden', nombres: { 15: 'Eucalipto' }, eventos: ['boda', '15', 'bautismo', 'comunion', 'cumple'], gratis: true },
];

export const TIPOS_EVENTO = [
  { id: 'boda', nombre: 'Boda' },
  { id: '15', nombre: '15 años' },
  { id: 'bautismo', nombre: 'Bautismo' },
  { id: 'comunion', nombre: 'Comunión' },
  { id: 'cumple', nombre: 'Cumpleaños' },
];

export const modelo = (id) => MODELOS.find((m) => m.id === id) || null;
export const nombreModelo = (m, tipo) => m.nombres?.[tipo] || m.nombre;
