/** A probe that gets no answer within this long counts as failed (a hanging request never ends the loop). */
const PROBE_TIMEOUT_MS = 8000;

interface ProbeOptions {
  url: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

/**
 * One GET to the API's public liveness route (`/health`, no auth, `{ status: 'ok' }`). Any HTTP
 * response means the network and the API are reachable; only no response (or a timeout) is a failure.
 */
export async function probeApi({ url, fetch: get = fetch, timeoutMs = PROBE_TIMEOUT_MS }: ProbeOptions): Promise<boolean> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    await get(url, { method: 'GET', cache: 'no-store', signal: abort.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
