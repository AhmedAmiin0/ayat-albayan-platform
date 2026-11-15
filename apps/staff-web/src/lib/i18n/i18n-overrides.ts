import { applyStrings, type FlatStrings, type Locale } from '@ab/shared';

// Dynamic translations at boot: GET /i18n/:locale/overrides (public, ETag) is merged into `t`
// before the first render. The page never waits longer than the timeout: on a slow or failed
// request it renders with the bundled texts, which are always complete.

export const OVERRIDES_TIMEOUT_MS = 1500;

export interface OverridesRequest {
  apiUrl: string;
  locale: Locale;
  timeoutMs?: number;
}

/** Only string values survive: a malformed body changes nothing. */
function asStrings(body: unknown): FlatStrings {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return {};
  return Object.fromEntries(Object.entries(body).filter((e): e is [string, string] => typeof e[1] === 'string'));
}

/** The overrides map, or {} on timeout, network error, non-2xx or a malformed body. Never throws. */
export async function fetchOverrides(req: OverridesRequest): Promise<FlatStrings> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), req.timeoutMs ?? OVERRIDES_TIMEOUT_MS);
  try {
    // no-cache: revalidate with the ETag every load, so a saved edit shows on the next reload
    // instead of after the 60 s max-age (a 304 is a few bytes).
    const res = await fetch(`${req.apiUrl}/i18n/${req.locale}/overrides`, { signal: ctrl.signal, cache: 'no-cache' });
    return res.ok ? asStrings(await res.json()) : {};
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches and writes the overrides into `target` (lib/i18n `t`); how many texts changed. */
export async function loadOverrides(target: object, req: OverridesRequest): Promise<number> {
  return applyStrings(target, await fetchOverrides(req));
}
