// Save The Date web Soft (boda y 15)
import { simple } from './simple-comun.mjs';
export async function ajustar(doc, ctx) {
  simple(doc, ctx, { mensaje: ['Esperamos que nos puedas acompañar'], fecha: 'principal', agendar: 'celebracion' });
}
