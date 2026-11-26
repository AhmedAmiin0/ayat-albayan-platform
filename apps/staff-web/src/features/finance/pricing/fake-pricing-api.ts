import {
  PACKAGE_IDS,
  parseDiscount,
  priceList,
  PRICING_DURATIONS,
  quote,
  roundingSchema,
  type PriceListResponse,
  type Quote,
} from '@ab/money';
import type { CatalogResponse, FxRate, QuoteResponse } from './api';

// Test double for GET /pricing/quote, /pricing/list and /pricing/catalog: answers the way
// PricingService does (the shared `quote` at a fixed rate) so component tests see real catalog
// numbers.

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
    discount: parseDiscount(params.get('discount') ?? '0'),
    // A rounding the API does not know throws, as its 400 would fail the request.
    rounding: roundingSchema.optional().parse(params.get('rounding') ?? undefined),
    usdRate: FAKE_FX.rate,
    fx: country ? null : FAKE_FX,
  };
}

type Asked = ReturnType<typeof options>;
type Answer = QuoteResponse | CatalogResponse | PriceListResponse;

function catalog({ fx, ...o }: Asked): CatalogResponse {
  const packages: Quote[] = PACKAGE_IDS.map((tier) =>
    quote({ ...o, tier, students: 1, discount: 0 }),
  );
  const first = packages[0];
  if (!first) throw new Error('empty catalog');
  return { country: first.country, currency: first.currency, duration: o.duration, packages, fx };
}

const list = ({ fx, ...o }: Asked): PriceListResponse => ({ ...priceList(o), fx });

function single({ fx, ...o }: Asked, params: URLSearchParams): QuoteResponse {
  const tier = PACKAGE_IDS.find((id) => id === params.get('tier'));
  const q = tier ? quote({ ...o, tier }) : quote({ ...o, count: Number(params.get('count')) });
  return { ...q, fx };
}

const ANSWERS: Readonly<Record<string, (asked: Asked, params: URLSearchParams) => Answer>> = {
  '/pricing/catalog': catalog,
  '/pricing/list': list,
};

/** A resolved value for `apiFetch(path)`. */
export function fakePricingApi(path: string): Answer {
  const url = new URL(path, 'http://api.test');
  const answer = ANSWERS[url.pathname] ?? single;
  return answer(options(url.searchParams), url.searchParams);
}
