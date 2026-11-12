// README (ronda 52): ganchos de Node para npm run local: «cloudflare:workers» → scripts/cloudflare-workers-local.mjs
export async function resolve(especificador, contexto, siguiente) {
  if (especificador === 'cloudflare:workers') return { url: new URL('./cloudflare-workers-local.mjs', import.meta.url).href, shortCircuit: true };
  return siguiente(especificador, contexto);
}
