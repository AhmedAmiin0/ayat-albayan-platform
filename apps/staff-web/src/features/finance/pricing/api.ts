import { pricingCalls, toQueryString } from '@ab/client-core';
import {
  CUSTOM_COUNT_DEFAULT,
  DEFAULT_DURATION,
  DEFAULT_ROUNDING,
  STUDENTS_MIN,
  type PackageId,
  type PricingDuration,
  type Rounding,
  type SiteCountry,
} from '@ab/money';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { pricingKeys } from '@/features/finance/keys';

// Shapes returned by apps/api/src/modules/pricing (docs/08). The client never prices anything:
// every number on the calculator comes from these responses.
export type { CatalogResponse, FxRate, QuoteResponse } from '@ab/money';

/** No country is sent, so the API quotes in USD. */
export const OTHER = 'other' as const;

/** What the staff member picked on the calculator. */
export interface Selection {
  country: SiteCountry | typeof OTHER;
  duration: PricingDuration;
  pkg: PackageId | 'custom';
  /** Custom count 1 to 60; kept when another package is picked. */
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

const pricing = pricingCalls({ apiFetch, apiSend });

/** `country` is left out (never empty) for another country: `country=` is a 400. */
function catalogParams(sel: CatalogSelection) {
  return { country: sel.country === OTHER ? undefined : sel.country, duration: sel.duration };
}

/**
 * Exactly one of `tier` / `count`, as GET /pricing/quote requires. Nearest is the API's own
 * rounding and is left out, so only the chat's quote sheet, which offers the choice, ever sends
 * one: the calculator and the package forms keep their requests and their cache keys.
 */
function quoteParams(sel: Selection, rounding: Rounding = DEFAULT_ROUNDING) {
  const pick = sel.pkg === 'custom' ? { count: sel.count } : { tier: sel.pkg };
  return {
    ...catalogParams(sel),
    ...pick,
    students: sel.students,
    discount: sel.discount,
    rounding: rounding === DEFAULT_ROUNDING ? undefined : rounding,
  };
}

const searchOf = (params: Record<string, string | number | undefined>) =>
  toQueryString(params).slice(1);

export const catalogSearch = (sel: CatalogSelection): string => searchOf(catalogParams(sel));

export const quoteSearch = (sel: Selection, rounding?: Rounding): string =>
  searchOf(quoteParams(sel, rounding));

// keepPreviousData: the result keeps showing the last quote while the next one loads.
export const quoteQuery = (sel: Selection, rounding?: Rounding) => {
  const params = quoteParams(sel, rounding);
  return queryOptions({
    queryKey: pricingKeys.quote(searchOf(params)),
    queryFn: () => pricing.quote(params),
    placeholderData: keepPreviousData,
  });
};

export const catalogQuery = (sel: CatalogSelection) => {
  const params = catalogParams(sel);
  return queryOptions({
    queryKey: pricingKeys.catalog(searchOf(params)),
    queryFn: () => pricing.catalog(params),
    placeholderData: keepPreviousData,
  });
};
