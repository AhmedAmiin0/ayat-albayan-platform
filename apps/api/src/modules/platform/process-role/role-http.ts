import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { AppRole } from '../../../config/role/app-role';

const WORKER_PATHS = ['/health', '/internal/jobs/'];

/** Is this path closed in this role? The worker serves /health and its kick route only; the others never /internal. */
export function closedPath(role: AppRole, url: string): boolean {
  const path = url.split('?')[0] ?? url;
  if (role !== 'worker') return path.startsWith('/internal/');
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
