import {
  DEFAULT_DURATION,
  lessonsOf,
  type CurrencyIso,
  type Discount,
  type PackageId,
  type PricingDuration,
  type Quote,
  type SiteCountry,
} from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// Shapes returned by apps/api/src/modules/pricing (docs/08). The client never prices anything:
// every number on the calculator comes from these responses.

/** The rate a USD quote used (FxService.FxRate). */
export interface FxRate {
  quote: string;
  rate: number;
  /** Provider publication time (ISO); null for the peg. */
  date: string | null;
  provider: string;
  /** No rate was ever stored: the official 3.75 peg was used. */
  fallback: boolean;
  /** The API failed and an older stored rate was used: hours since it was published. */
  ageHours: number | null;
}

export type QuoteResponse = Quote & { fx: FxRate | null };

export interface CatalogResponse {
  country: SiteCountry | null;
  currency: CurrencyIso;
  duration: number;
  /** All six packages in site order, one student, no discount. */
  packages: Quote[];
  fx: FxRate | null;
}

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
  discount: Discount;
}

export const INITIAL_SELECTION: Selection = {
  country: 'SA',
  duration: DEFAULT_DURATION,
  pkg: 'standard',
  count: lessonsOf('starter'),
  students: 1,
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
