/**
 * Which part of the API this process runs (docs/09 «Two API copies + one worker»), from env APP_ROLE:
 * - `api`: HTTP and webhooks only; no background job runs here, a «run now» goes to the worker.
 * - `worker`: every background job; HTTP only for /health and the internal kick route.
 * - `all` (default: local dev, tests, e2e, today's single container): both in one process, the same jobs and
 *   routes as before. Not byte-for-byte the old process: SIGTERM now runs the shutdown hooks (requests
 *   in flight finish, timers stop), and the sign-in code limits count in the database (rate_limit_hits)
 *   instead of in memory, so they survive a restart.
 * Read here only; jobs are gated by @BackgroundJob (modules/platform/process-role), never by their own `if`.
 */
export type AppRole = 'api' | 'worker' | 'all';

const ROLES: readonly AppRole[] = ['api', 'worker', 'all'];

/** Unset or blank = `all`; anything else unknown stops the boot (a typo must not start a second job runner). */
export function appRole(source: NodeJS.ProcessEnv = process.env): AppRole {
  const raw = (source.APP_ROLE ?? '').trim();
  if (raw === '') return 'all';
  const role = ROLES.find((r) => r === raw);
  if (!role) throw new Error(`APP_ROLE must be api, worker or all (got "${raw.slice(0, 20)}")`);
  return role;
}

/** Background jobs, pollers and their «run now» kicks run in this process. */
export const runsJobs = (role: AppRole): boolean => role !== 'api';

/** The public routes (everything but /health and the internal kick route) are served. */
export const servesPublicHttp = (role: AppRole): boolean => role !== 'worker';

/**
 * How many proxies in front of the API Fastify trusts for req.ip (X-Forwarded-For). 1 = the host Caddy
 * alone (one process, as before); 2 = the host Caddy and the staging load balancer (deploy/staging).
 * Trusting more hops than there are would let a visitor pick their own IP (the rate limits key on it).
 */
export function trustProxyHops(source: NodeJS.ProcessEnv = process.env): number {
  const raw = (source.TRUST_PROXY_HOPS ?? '').trim();
  if (raw === '') return 1;
  const hops = Number(raw);
  if (!Number.isInteger(hops) || hops < 0 || hops > 5)
    throw new Error(`TRUST_PROXY_HOPS must be 0..5 (got "${raw.slice(0, 20)}")`);
  return hops;
}

const baseUrl = (raw: string): string => raw.trim().replace(/\/+$/, '');

/** The worker's internal base URL (http://ayat-worker:3000 in deploy/staging); unset = no forwarding. */
export function workerUrl(source: NodeJS.ProcessEnv = process.env): string | null {
  const raw = baseUrl(source.WORKER_URL ?? '');
  return raw === '' ? null : raw;
}

/**
 * The other API copies' internal base URLs (PEER_URLS, comma-separated: http://ayat-api-b:3000 on
 * ayat-api-a), which an admin save on this copy also asks to reload their config; unset = none.
 */
export function peerUrls(source: NodeJS.ProcessEnv = process.env): string[] {
  return (source.PEER_URLS ?? '').split(',').map(baseUrl).filter((u) => u !== '');
}
