// Compromiso (boda, modelo simple)
import { simple } from './simple-comun.mjs';
export async function ajustar(doc, ctx) { simple(doc, ctx, { frase: '¡NOS HEMOS COMPROMETIDO!', fecha: 'celebracion', lugares: { map2: 'celebracion' }, botonTitulo: false }); }
