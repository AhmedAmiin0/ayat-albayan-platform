import type { Quote } from '@ab/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';
import { quoteParams, type Selection } from './selection';

/** The rate a USD quote used (apps/api fx.service FxRate); null for the site's own currencies. */
export interface QuoteFx {
  quote: string;
  rate: number;
  /** Provider publication time (ISO); null for the 3.75 peg. */
  date: string | null;
  provider: string;
  /** No rate was ever stored: priced at the SAR/USD peg. */
  fallback: boolean;
  /** The API was down and an older stored rate was used. */
  ageHours: number | null;
}

export type QuoteResponse = Quote & { fx: QuoteFx | null };

const PATH = '/pricing/quote';

/**
 * GET /pricing/quote for the current choice. The app never prices anything itself. While a new
 * choice loads the last card stays (placeholder) so the screen doesn't jump; `isPlaceholderData`
 * tells the offer buttons not to send that old price.
 */
export function useQuote(selection: Selection) {
  const params = quoteParams(selection);
  return useQuery({
    queryKey: [...pathKey(PATH), params],
    queryFn: () => apiFetch<QuoteResponse>(`${PATH}${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}
