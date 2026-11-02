// Party (15 años, modelo simple)
import { simple } from './simple-comun.mjs';
export async function ajustar(doc, ctx) { simple(doc, ctx, { fecha: 'principal', lugares: { map2: 'celebracion' }, botonTitulo: false }); }
