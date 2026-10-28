import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { AppRole } from '../../../config/role/app-role';
import { PEER_RELOAD_PATH } from '../../../config/role/worker-kick';

const WORKER_PATHS = ['/health', '/internal/jobs/'];

/** The path as the router matches it (percent-decoded, so `/%69nternal` is `/internal`); undecodable = as is. */
function decoded(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Is this path closed in this role? The worker serves /health and its kick route only; the others never
 * /internal but the peer config reload (token-checked; deploy/staging's load balancer never forwards /internal).
 */
export function closedPath(role: AppRole, url: string): boolean {
  const path = decoded(url.split('?')[0] ?? url);
  if (role !== 'worker') return path.startsWith('/internal/') && path !== PEER_RELOAD_PATH;
  return !WORKER_PATHS.some((p) =>
    p.endsWith('/') ? path.startsWith(p) : path === p || path === `${p}/`,
  );
}

/** One onRequest hook: a closed path answers 404 before any guard, parser or handler runs. */
export function registerRoleHttp(app: NestFastifyApplication, role: AppRole): void {
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRequest', (req, reply, done) => {
      if (!closedPath(role, req.url)) return done();
      void reply.code(404).send({ code: 'not_found', message: 'not_found' });
    });
}
