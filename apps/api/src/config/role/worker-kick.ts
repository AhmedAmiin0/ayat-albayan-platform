import { createHmac, timingSafeEqual } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { loadEnv } from '../env/env';
import { appRole, peerUrls, workerUrl } from './app-role';

/** The longest a request waits for the worker's pass (the inbox «send now» awaits one sender pass). */
const KICK_TIMEOUT_MS = 30_000;
export const INTERNAL_HEADER = 'x-ab-internal';

const log = new Logger('WorkerKick');

/** Proof that a kick comes from an API copy: an HMAC of the service-role key both read from the same .env. */
export const internalToken = (): string =>
  createHmac('sha256', loadEnv().SUPABASE_SERVICE_ROLE_KEY)
    .update('ab-worker-kick')
    .digest('base64url');

export function validInternalToken(given: string | undefined): boolean {
  const want = Buffer.from(internalToken());
  const got = Buffer.from(given ?? '');
  return got.length === want.length && timingSafeEqual(got, want);
}

/** The peer route: an API copy's own config reload (jobs.controller), served on API copies too. */
export const PEER_RELOAD_PATH = '/internal/jobs/config-reload/here';

/** One authenticated POST to an internal route. Never throws: a refused or slow target is only logged. */
async function postInternal(url: string, what: string): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { [INTERNAL_HEADER]: internalToken() },
      signal: AbortSignal.timeout(KICK_TIMEOUT_MS),
    });
    if (!res.ok) log.warn(`${what}: answered ${res.status}, left for its next poll`);
  } catch (e) {
    log.warn(`${what}: failed (${e instanceof Error ? e.message : String(e)}), left for its next poll`);
  }
}

/**
 * «Run now» from an `api` process: asks the worker to kick the job and waits for its pass. Never throws
 * (as a local kick): no WORKER_URL, a refused or slow worker only means the job's own poll picks it up.
 */
export async function kickWorker(name: string): Promise<void> {
  const base = workerUrl();
  if (!base) {
    log.warn(`${name}: no WORKER_URL, left for the worker's next poll`);
    return;
  }
  await postInternal(`${base}/internal/jobs/${encodeURIComponent(name)}/kick`, `${name}: worker kick`);
}

/**
 * After an admin save in an `api` process (which reloaded its own config already): the worker reloads
 * its copy too (ConfigReloadJob), and so does every other API copy (PEER_URLS), so no cache waits for its
 * own refresh. Not awaited: the save never waits on a busy worker (a PDF render), and nothing here
 * throws. Elsewhere a no-op: `all` is one process, a `worker` serves no saves.
 */
export function kickConfigReload(): void {
  if (appRole() !== 'api') return;
  void kickWorker('config-reload');
  for (const peer of peerUrls()) void postInternal(`${peer}${PEER_RELOAD_PATH}`, `config-reload: peer ${peer}`);
}
