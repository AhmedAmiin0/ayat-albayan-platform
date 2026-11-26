import type { QuoteResponse, Rounding } from '@ab/money';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString, pathKey } from '@ab/mobile-kit';
import { quoteParams, type Selection } from './selection';

/** The rate a USD quote used; null for the site's own currencies. */
export type { FxRate as QuoteFx, QuoteResponse } from '@ab/money';

const PATH = '/pricing/quote';

/** What only the chat's quote sheet asks; the calculator and the package forms pass nothing. */
interface QuoteAsk {
  /** How the price after the discount reaches a whole unit; left out: nearest. */
  rounding?: Rounding;
  /** Off while the sheet shows the whole price list instead of one package. */
  enabled?: boolean;
}

/**
 * GET /pricing/quote for the current choice. The app never prices anything itself. While a new
 * choice loads the last card stays (placeholder) so the screen doesn't jump; `isPlaceholderData`
 * tells the offer buttons not to send that old price.
 */
export function useQuote(selection: Selection, ask: QuoteAsk = {}) {
  const params = quoteParams(selection, ask.rounding);
  return useQuery({
    queryKey: [...pathKey(PATH), params],
    queryFn: () => apiFetch<QuoteResponse>(`${PATH}${toQueryString(params)}`),
    placeholderData: keepPreviousData,
    enabled: ask.enabled ?? true,
  });
}
