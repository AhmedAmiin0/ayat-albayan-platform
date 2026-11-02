import type { QuoteResponse } from '@ab/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { quoteParams, type Selection } from './selection';

/** The rate a USD quote used; null for the site's own currencies. */
export type { FxRate as QuoteFx, QuoteResponse } from '@ab/shared';

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
