// Modelos que se venden en la tienda. Cada uno tiene su carpeta en public/modelos/<id>/
// (index.html, modelo.json, tema.css, estilo.css, img/ y demo/).
// Cuando un diseño se separa por tipo de evento (por ejemplo "aquarella-bautismo"),
// se suma acá como un modelo más con un solo tipo de evento.

export const MODELOS = [
  // PROVISORIO: Garden con plan gratis para poder probarlo hasta convertir los modelos gratis
  // (Oliva, Armonía, White, Minimal, Floral). Antes del lanzamiento: gratis: false.
  { id: 'garden', nombre: 'Garden', nombres: { 15: 'Eucalipto', cumple: 'Eucalipto' }, eventos: ['boda', '15', 'bautismo', 'comunion', 'cumple'], gratis: true },
  // Convertidos de la v2.0 con scripts/conversion/lote.mjs (boda, 15 y cumpleaños de cada familia)
  { id: 'aquarella', nombre: 'Aquarella', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'armonia', nombre: 'Armonía', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'beach', nombre: 'Beach', eventos: ['boda',  '15',  'cumple'], gratis: false },
  { id: 'black', nombre: 'Black', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'byn', nombre: 'B&N', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'cinema', nombre: 'Cinema', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'disco', nombre: 'Disco', nombres: { cumple: 'Discoteque', graduacion: 'Discoteque' }, eventos: ['boda', '15', 'cumple', 'graduacion'], gratis: false },
  { id: 'euforia', nombre: 'Euforia', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'floral', nombre: 'Floral', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'graffiti', nombre: 'Graffiti', eventos: ['boda',  '15',  'cumple'], gratis: false },
  { id: 'hojas', nombre: 'Hojas', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'lila', nombre: 'Lila', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'minimal', nombre: 'Minimal', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'passion', nombre: 'Passion', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'rockabilly', nombre: 'Rockabilly', eventos: ['boda',  '15',  'cumple'], gratis: false },
  { id: 'romantic', nombre: 'Romantic', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'rouge', nombre: 'Rouge', eventos: ['boda',  '15',  'cumple'], gratis: false },
  { id: 'sky', nombre: 'Sky', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'travel', nombre: 'Travel', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'white', nombre: 'White', eventos: ['boda',  '15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'luxury', nombre: 'Luxury', eventos: ['15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'style', nombre: 'Style', eventos: ['15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'sweet', nombre: 'Sweet', eventos: ['15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'natural', nombre: 'Natural', eventos: ['15',  'cumple', 'bautismo', 'comunion'], gratis: false },
  { id: 'party', nombre: 'Party', eventos: ['15'], gratis: false },
  { id: 'elegance', nombre: 'Elegance', eventos: ['boda'], gratis: false },
  { id: 'vintage', nombre: 'Vintage', eventos: ['boda'], gratis: false },
  { id: 'oliva', nombre: 'Oliva', eventos: ['boda'], gratis: false },
  { id: 'lovestory', nombre: 'Love Story', eventos: ['boda'], gratis: false },
  { id: 'amanecer', nombre: 'Amanecer', eventos: ['bautismo', 'comunion'], gratis: false },
  { id: 'celeste', nombre: 'Celeste', eventos: ['bautismo', 'babyshower'], gratis: false },
  { id: 'rosa', nombre: 'Rosa', eventos: ['bautismo', 'babyshower'], gratis: false },
  { id: 'revelacion', nombre: 'Revelación', eventos: ['revelacion'], gratis: false },
  { id: 'esmeralda', nombre: 'Esmeralda', eventos: ['graduacion'], gratis: false },
  { id: 'estilo', nombre: 'Estilo', eventos: ['graduacion'], gratis: false },
  { id: 'marino', nombre: 'Marino', eventos: ['graduacion'], gratis: false },
  { id: 'oro', nombre: 'Oro', eventos: ['graduacion'], gratis: false },
  { id: 'cars', nombre: 'Cars', eventos: ['infantil'], gratis: false },
  { id: 'monster', nombre: 'Monster', eventos: ['infantil'], gratis: false },
  { id: 'peppa', nombre: 'Peppa', eventos: ['infantil'], gratis: false },
  { id: 'navidad', nombre: 'Navidad', eventos: ['navidad'], gratis: false },
];

export const TIPOS_EVENTO = [
  { id: 'boda', nombre: 'Boda' },
  { id: '15', nombre: '15 años' },
  { id: 'bautismo', nombre: 'Bautismo' },
  { id: 'comunion', nombre: 'Comunión' },
  { id: 'cumple', nombre: 'Cumpleaños' },
  { id: 'infantil', nombre: 'Cumpleaños infantil' },
  { id: 'graduacion', nombre: 'Egreso / Graduación' },
  { id: 'babyshower', nombre: 'Baby shower' },
  // Se elige dentro de Baby Shower (es un diseño de baby shower con dos nombres)
  { id: 'revelacion', nombre: 'Revelación de género', grupo: 'babyshower' },
  { id: 'navidad', nombre: 'Navidad' },
];

export const modelo = (id) => MODELOS.find((m) => m.id === id) || null;
export const nombreModelo = (m, tipo) => m.nombres?.[tipo] || m.nombre;

// modelo.json con lo propio del tipo de evento encima (porEvento.<tipo>: sobre, paleta, demo, paquetes…).
// Los objetos se mezclan; las listas y los valores sueltos se reemplazan.
const mezclar = (a, b) => {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return b === undefined ? a : b;
  const r = { ...(a && typeof a === 'object' && !Array.isArray(a) ? a : {}) };
  for (const [k, v] of Object.entries(b)) r[k] = mezclar(r[k], v);
  return r;
};
export const conEvento = (m, tipo) => (m && tipo && m.porEvento?.[tipo] ? mezclar(m, m.porEvento[tipo]) : m);
