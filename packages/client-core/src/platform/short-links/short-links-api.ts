import {
  shortCodeSchema,
  shortLinkDetailSchema,
  shortLinkGateViewSchema,
  shortLinkPageSchema,
  shortLinkPersonSchema,
  type ShortLinkDetail,
  type ShortLinkGateView,
  type ShortLinkListQuery,
  type ShortLinkPage,
  type ShortLinkPerson,
} from '@ab/shared';
import { z } from 'zod';
import { ApiError, toQueryString, type ApiClient } from '../../core/http/index.js';
import { listKey, pathKey } from '../../core/keys/index.js';

// «الروابط المختصرة» (docs/19 «Managed links»): the reads both apps use. The
// admin / sales routes sit under /short-links; the web gate /l/<code> reads the public view.
// Plain TanStack Query options (no React), answers parsed with the shared zod schemas.

export const SHORT_LINKS_PATH = '/short-links';
export const SHORT_LINKS_PUBLIC_PATH = '/public/short-links';
export const enc = encodeURIComponent;

/** Every admin query sits under this key: one invalidation refreshes lists and details. */
export const SHORT_LINKS_KEY = pathKey(SHORT_LINKS_PATH);
/** The gate's public view (never mixed with the admin cache). */
export const SHORT_LINK_GATE_KEY = pathKey(SHORT_LINKS_PUBLIC_PATH);

/** The picker searches from this many characters (the API's own minimum). */
export const PEOPLE_SEARCH_MIN = 2;

/** The gate's view, or the one 404 an unknown, system or malformed code answers. */
export type GateViewResult =
  | { kind: 'view'; view: ShortLinkGateView }
  | { kind: 'not_found' };

export const GATE_NOT_FOUND: GateViewResult = { kind: 'not_found' };

export interface ShortLinkQuery<T> {
  queryKey: unknown[];
  queryFn: () => Promise<T>;
}

export interface PeopleQuery extends ShortLinkQuery<ShortLinkPerson[]> {
  enabled: boolean;
}

/** The list's filters; the page defaults to 1 and the size to the API's 20. */
export type ShortLinkListFilter = Partial<ShortLinkListQuery>;

export interface ShortLinkQueries {
  listQuery: (filter: ShortLinkListFilter) => ShortLinkQuery<ShortLinkPage>;
  detailQuery: (code: string) => ShortLinkQuery<ShortLinkDetail>;
  /** The picker: enabled only from PEOPLE_SEARCH_MIN characters. */
  peopleQuery: (search: string) => PeopleQuery;
  /** The public gate view; a 404 resolves as `not_found` instead of throwing. */
  gateViewQuery: (code: string) => ShortLinkQuery<GateViewResult>;
}

const people = z.array(shortLinkPersonSchema);

const isNotFound = (e: unknown): boolean => e instanceof ApiError && e.status === 404;

/** A 404 is an answer (the «لم نجد هذا الرابط» screen); anything else stays an error. */
function notFoundOr(e: unknown): GateViewResult {
  if (isNotFound(e)) return GATE_NOT_FOUND;
  throw e;
}

const searchTerm = (search: string): string => search.trim();

async function readGate(client: ApiClient, code: string): Promise<GateViewResult> {
  if (!shortCodeSchema.safeParse(code).success) return GATE_NOT_FOUND;
  const body = await client.apiFetch(`${SHORT_LINKS_PUBLIC_PATH}/${enc(code)}`);
  return { kind: 'view', view: shortLinkGateViewSchema.parse(body) };
}

export function shortLinkQueries(client: ApiClient): ShortLinkQueries {
  return {
    listQuery: (filter) => ({
      queryKey: listKey(SHORT_LINKS_PATH, filter),
      queryFn: async () => {
        const path = `${SHORT_LINKS_PATH}${toQueryString(filter)}`;
        return shortLinkPageSchema.parse(await client.apiFetch(path));
      },
    }),
    detailQuery: (code) => ({
      queryKey: [...SHORT_LINKS_KEY, code],
      queryFn: async () => {
        const body = await client.apiFetch(`${SHORT_LINKS_PATH}/${enc(code)}`);
        return shortLinkDetailSchema.parse(body);
      },
    }),
    peopleQuery: (search) => ({
      queryKey: [...SHORT_LINKS_KEY, 'people', searchTerm(search)],
      enabled: searchTerm(search).length >= PEOPLE_SEARCH_MIN,
      queryFn: async () => {
        const query = toQueryString({ search: searchTerm(search) });
        return people.parse(await client.apiFetch(`${SHORT_LINKS_PATH}/people${query}`));
      },
    }),
    gateViewQuery: (code) => ({
      queryKey: [...SHORT_LINK_GATE_KEY, code],
      queryFn: () => readGate(client, code).catch(notFoundOr),
    }),
  };
}
