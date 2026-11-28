import { routePath } from '@ab/core';
import { translationRoutes } from '@ab/i18n';
import { probe, type ProbeAnswer, type ProbeOptions } from '../../core/http';
import { type Overrides, overridesSchema } from './overrides.schemas';
import type { OverridesOptions, OverridesRequest } from './read-overrides.types';

// The admins' translation overrides at boot (web and phone). A bare GET with no token or custom
// header, so the browser sends no CORS preflight inside the short boot budget: hence a probe, not
// call(). Its schema drops a value that is not text instead of refusing the whole map.

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
  const path = routePath(translationRoutes.overrides, { locale: req.locale });
  const url = `${req.apiUrl}${path}`;
  const parsed = overridesSchema.safeParse(successBody(await probe(url, probeOptions(opts))));
  return parsed.success ? parsed.data : null;
}
