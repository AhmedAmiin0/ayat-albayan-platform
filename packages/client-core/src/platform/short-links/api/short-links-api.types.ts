import type {
  ShortLinkDetail,
  ShortLinkListQuery,
  ShortLinkPage,
  ShortLinkPerson,
} from '@ab/shared';

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
}
