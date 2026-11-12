// README (ronda 52): en la compu (npm run local) no existe el módulo «cloudflare:workers» del Worker.
// Este reemplazo trae lo mínimo (WorkerEntrypoint) para que src/socios.js se pueda importar con Node.
export class WorkerEntrypoint { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }
