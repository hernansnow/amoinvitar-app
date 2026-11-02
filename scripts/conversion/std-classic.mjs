// Save The Date web Classic (boda y 15; la de 15 era "Save The Date web 15")
import { simple } from './simple-comun.mjs';
export async function ajustar(doc, ctx) {
  simple(doc, ctx, { mensaje: ['Te esperamos para celebrar nuestro casamiento.', 'Espero que me acompañes en mi gran noche'], fecha: 'principal', agendar: 'celebracion' });
}
