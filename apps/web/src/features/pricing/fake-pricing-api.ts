import { DISCOUNTS, PACKAGE_IDS, PRICING_DURATIONS, quote, type Quote } from '@ab/shared';
import type { CatalogResponse, FxRate, QuoteResponse } from './api';

// Test double for GET /pricing/quote and /pricing/catalog: answers the way PricingService does
// (the shared `quote` at a fixed rate) so component tests see real catalog numbers.

export const FAKE_FX: FxRate = {
  quote: 'USD',
  rate: 0.266667,
  date: '2026-10-02T00:00:01+00:00',
  provider: 'open.er-api.com',
  fallback: false,
  ageHours: null,
};

function options(params: URLSearchParams) {
  const country = params.get('country');
  return {
    country,
    duration: PRICING_DURATIONS.find((d) => String(d) === params.get('duration')) ?? 45,
    students: Number(params.get('students') ?? 1),
    discount: DISCOUNTS.find((d) => String(d) === params.get('discount')) ?? 0,
    usdRate: FAKE_FX.rate,
    fx: country ? null : FAKE_FX,
  };
}

/** A resolved value for `apiFetch(path)`. */
export function fakePricingApi(path: string): QuoteResponse | CatalogResponse {
  const url = new URL(path, 'http://api.test');
  const { fx, ...o } = options(url.searchParams);
  if (url.pathname === '/pricing/catalog') {
    const packages: Quote[] = PACKAGE_IDS.map((tier) =>
      quote({ ...o, tier, students: 1, discount: 0 }),
    );
    const first = packages[0];
    if (!first) throw new Error('empty catalog');
    return { country: first.country, currency: first.currency, duration: o.duration, packages, fx };
  }
  const tier = PACKAGE_IDS.find((id) => id === url.searchParams.get('tier'));
  const q = tier
    ? quote({ ...o, tier })
    : quote({ ...o, count: Number(url.searchParams.get('count')) });
  return { ...q, fx };
}
