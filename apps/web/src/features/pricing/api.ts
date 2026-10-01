import {
  CUSTOM_COUNT_DEFAULT,
  DEFAULT_DURATION,
  STUDENTS_MIN,
  type CatalogResponse,
  type PackageId,
  type PricingDuration,
  type QuoteResponse,
  type SiteCountry,
} from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// Shapes returned by apps/api/src/modules/pricing (docs/08). The client never prices anything:
// every number on the calculator comes from these responses.
export type { CatalogResponse, FxRate, QuoteResponse } from '@ab/shared';

/** «دولة تانية (بالدولار)»: no country is sent, so the API quotes in USD. */
export const OTHER = 'other' as const;

/** What the staff member picked on the calculator. */
export interface Selection {
  country: SiteCountry | typeof OTHER;
  duration: PricingDuration;
  pkg: PackageId | 'custom';
  /** Lessons for «عدد مخصوص» (1–60); kept when another package is picked. */
  count: number;
  students: number;
  /** Percent 0–100: a pill or the free field. */
  discount: number;
}

export const INITIAL_SELECTION: Selection = {
  country: 'SA',
  duration: DEFAULT_DURATION,
  pkg: 'standard',
  count: CUSTOM_COUNT_DEFAULT,
  students: STUDENTS_MIN,
  discount: 0,
};

type CatalogSelection = Pick<Selection, 'country' | 'duration'>;

// `country` is left out (never empty) for another country: `country=` is a 400.
function baseParams(sel: CatalogSelection): URLSearchParams {
  const params = new URLSearchParams();
  if (sel.country !== OTHER) params.set('country', sel.country);
  params.set('duration', String(sel.duration));
  return params;
}

export function catalogSearch(sel: CatalogSelection): string {
  return baseParams(sel).toString();
}

/** Exactly one of `tier` / `count`, as GET /pricing/quote requires. */
export function quoteSearch(sel: Selection): string {
  const params = baseParams(sel);
  if (sel.pkg === 'custom') params.set('count', String(sel.count));
  else params.set('tier', sel.pkg);
  params.set('students', String(sel.students));
  params.set('discount', String(sel.discount));
  return params.toString();
}

// keepPreviousData: the result keeps showing the last quote while the next one loads.
export const quoteQuery = (sel: Selection) => {
  const search = quoteSearch(sel);
  return queryOptions({
    queryKey: ['pricing', 'quote', search],
    queryFn: () => apiFetch<QuoteResponse>(`/pricing/quote?${search}`),
    placeholderData: keepPreviousData,
  });
};

export const catalogQuery = (sel: CatalogSelection) => {
  const search = catalogSearch(sel);
  return queryOptions({
    queryKey: ['pricing', 'catalog', search],
    queryFn: () => apiFetch<CatalogResponse>(`/pricing/catalog?${search}`),
    placeholderData: keepPreviousData,
  });
};
