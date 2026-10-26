import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { CLIENT_HEADER, parseClientTag } from './client-tag';
import type { UsageHit } from './client-usage.counter';

type Fastify = ReturnType<ReturnType<NestFastifyApplication['getHttpAdapter']>['getInstance']>;
type HitSink = { hit(h: UsageHit): void };

/** Route of a request with no matching route (404s): never the raw URL, which may carry ids. */
export const UNMATCHED_ROUTE = '(unmatched)';

/**
 * Counts every answered request by its matched route template (`routeOptions.url`, e.g.
 * `/students/:id`) × X-AB-Client. An onResponse hook, so guard failures and 404s count too.
 * CORS: main.ts sets no `allowedHeaders`, so @fastify/cors reflects the preflight's
 * Access-Control-Request-Headers and browsers may send X-AB-Client (client-usage.hook.test.ts).
 */
function addClientUsageHook(fastify: Fastify, sink: HitSink): void {
  fastify.addHook('onResponse', async (req) => {
    // CORS preflights carry no client header: noise, not usage.
    if (req.method === 'OPTIONS') return;
    sink.hit({
      method: req.method,
      route: req.routeOptions.url ?? UNMATCHED_ROUTE,
      client: parseClientTag(req.headers[CLIENT_HEADER]),
    });
  });
}

/** main.ts: count every request of the app into its ClientUsageService. */
export function registerClientUsage(app: NestFastifyApplication, sink: HitSink): void {
  addClientUsageHook(app.getHttpAdapter().getInstance(), sink);
}
