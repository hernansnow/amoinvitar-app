// Civil (boda, modelo simple): ceremonia civil y banquete, cada uno en su ventana
import { simple } from './simple-comun.mjs';
export async function ajustar(doc, ctx) { simple(doc, ctx, { frase: '¡VAMOS A DAR EL SI!', fecha: 'principal', lugares: { map1: 'ceremonia', map2: 'celebracion' } }); }
