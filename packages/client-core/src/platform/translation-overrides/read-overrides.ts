import { probe, type ProbeAnswer, type ProbeOptions } from '../../core/http';
import { type Overrides, overridesSchema } from './overrides.schemas';
import type { OverridesOptions, OverridesRequest } from './read-overrides.types';

// The admins' translation overrides at boot (web and phone). A bare GET with no token or custom
// header, so the browser sends no CORS preflight inside the short boot budget.

export const OVERRIDES_TIMEOUT_MS = 1500;

const probeOptions = (opts: OverridesOptions): ProbeOptions => ({
  timeoutMs: opts.timeoutMs ?? OVERRIDES_TIMEOUT_MS,
  cache: opts.cache ?? 'default',
  fetch: opts.fetch,
});

const isSuccess = (status: number): boolean => status >= 200 && status < 300;

const successBody = (answer: ProbeAnswer | null): unknown =>
  answer && isSuccess(answer.status) ? answer.body : null;

/** The server's map, or null on timeout, network error, non-2xx or a malformed body. */
export async function readOverrides(
  req: OverridesRequest,
  opts: OverridesOptions = {},
): Promise<Overrides | null> {
  const url = `${req.apiUrl}/i18n/${req.locale}/overrides`;
  const parsed = overridesSchema.safeParse(successBody(await probe(url, probeOptions(opts))));
  return parsed.success ? parsed.data : null;
}
