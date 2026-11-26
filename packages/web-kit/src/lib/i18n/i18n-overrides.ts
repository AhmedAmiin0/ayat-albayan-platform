import { type OverridesRequest, readOverrides } from '@ab/client-core';
import { applyStrings, type FlatStrings } from '@ab/i18n';

// Dynamic translations at boot: the overrides are merged into `t` before the first render. On a
// slow or failed request the page renders with the bundled texts, which are always complete.

/** The overrides map, or {} on timeout, network error, non-2xx or a malformed body. Never throws. */
export async function fetchOverrides(req: OverridesRequest): Promise<FlatStrings> {
  // no-cache: revalidate with the ETag every load, so a saved edit shows on the next reload
  // instead of after the 60 s max-age (a 304 is a few bytes).
  return (await readOverrides(req, { cache: 'no-cache' })) ?? {};
}

/** Fetches and writes the overrides into `target` (lib/i18n `t`); how many texts changed. */
export async function loadOverrides(target: object, req: OverridesRequest): Promise<number> {
  return applyStrings(target, await fetchOverrides(req));
}
