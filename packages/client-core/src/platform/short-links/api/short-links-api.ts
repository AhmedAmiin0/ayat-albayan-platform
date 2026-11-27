import {
  shortCodeSchema,
  shortLinkGateRoutes,
  shortLinkRoutes,
  type ShortLinkGateView,
} from '@ab/shared';
import { ApiError, callWith, type ApiClient } from '../../../core/http';
import { listKey, pathKey } from '../../../core/keys';
import type { GateViewResult, ShortLinkQueries } from './short-links-api.types';

// docs/19: staff routes are shortLinkRoutes; the web gate /l/<code> reads the public view.

const SHORT_LINKS_PUBLIC_PATH = '/public/short-links';

/** Every admin query sits under this key: one invalidation refreshes lists and details. */
export const SHORT_LINKS_KEY = pathKey(shortLinkRoutes.list.path);
/** The gate's public view (never mixed with the admin cache). */
export const SHORT_LINK_GATE_KEY = pathKey(SHORT_LINKS_PUBLIC_PATH);

/** The picker searches from this many characters (the API's own minimum). */
export const PEOPLE_SEARCH_MIN = 2;

export const GATE_NOT_FOUND: GateViewResult = { kind: 'not_found' };

const isNotFound = (e: unknown): boolean => e instanceof ApiError && e.status === 404;

/** A 404 is an answer (the not-found screen); anything else stays an error. */
function notFoundOr(e: unknown): GateViewResult {
  if (isNotFound(e)) return GATE_NOT_FOUND;
  throw e;
}

const asView = (view: ShortLinkGateView): GateViewResult => ({ kind: 'view', view });

const isShortCode = (code: string): boolean => shortCodeSchema.safeParse(code).success;

const searchTerm = (search: string): string => search.trim();

export function shortLinkQueries(client: ApiClient): ShortLinkQueries {
  const call = callWith(client);
  return {
    listQuery: (filter) => ({
      queryKey: listKey(shortLinkRoutes.list.path, filter),
      queryFn: () => call({ route: shortLinkRoutes.list, query: filter }),
    }),
    detailQuery: (code) => ({
      queryKey: [...SHORT_LINKS_KEY, code],
      queryFn: () => call({ route: shortLinkRoutes.detail, params: { code } }),
    }),
    peopleQuery: (search) => ({
      queryKey: [...SHORT_LINKS_KEY, 'people', searchTerm(search)],
      enabled: searchTerm(search).length >= PEOPLE_SEARCH_MIN,
      queryFn: () =>
        call({ route: shortLinkRoutes.people, query: { search: searchTerm(search) } }),
    }),
    gateViewQuery: (code) => ({
      queryKey: [...SHORT_LINK_GATE_KEY, code],
      queryFn: async () =>
        isShortCode(code)
          ? call({ route: shortLinkGateRoutes.view, params: { code } }).then(asView, notFoundOr)
          : GATE_NOT_FOUND,
    }),
  };
}
