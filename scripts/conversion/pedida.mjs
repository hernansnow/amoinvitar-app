// Pedida de mano (boda, modelo simple)
import { simple } from './simple-comun.mjs';
export async function ajustar(doc, ctx) {
  simple(doc, ctx, { frase: 'NUESTRA PEDIDA DE MANO', mensaje: ['Estamos listos para dar un paso más.Acompañanos en'], fecha: 'celebracion', lugares: { map2: 'celebracion' }, botonTitulo: false });
}
