import { shortLinkRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import { listKey, pathKey } from '../../../core/keys';
import type { ShortLinkQueries } from './short-links-api.types';

/** Every admin query sits under this key: one invalidation refreshes lists and details. */
export const SHORT_LINKS_KEY = pathKey(shortLinkRoutes.list.path);

/** The picker searches from this many characters (the API's own minimum). */
export const PEOPLE_SEARCH_MIN = 2;

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
  };
}
