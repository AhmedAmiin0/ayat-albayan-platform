import { readJson } from '../api-error';
import type { ProbeAnswer, ProbeOptions } from './probe.types';

/** A probe that has not settled in 8 s counts as no answer. */
export const PROBE_TIMEOUT_MS = 8_000;

const OPAQUE = 'opaque';

const initOf = (opts: ProbeOptions): RequestInit => ({
  method: 'GET',
  cache: opts.cache ?? 'no-store',
  mode: opts.mode ?? 'cors',
});

const bodyOf = (res: Response): Promise<unknown> =>
  res.type === OPAQUE ? Promise.resolve(null) : readJson(res);

/** No token or custom header avoids CORS preflight; RN lacks AbortSignal.timeout; never throws. */
export async function probe(url: string, opts: ProbeOptions = {}): Promise<ProbeAnswer | null> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), opts.timeoutMs ?? PROBE_TIMEOUT_MS);
  const send = opts.fetch ?? fetch;
  try {
    const res = await send(url, { ...initOf(opts), signal: abort.signal });
    return { status: res.status, body: await bodyOf(res) };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
