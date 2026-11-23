import type { ReactNode } from 'react';

export type QueryStateKind = 'loading' | 'error' | 'empty' | 'data';

/** What QueryState reads of a useQuery or useInfiniteQuery result. */
export interface QueryStateQuery<T> {
  data: T | undefined;
  isError: boolean;
  refetch: () => unknown;
}

export type QueryStateLoadable = Pick<QueryStateQuery<unknown>, 'data' | 'isError'>;

export interface QueryStateProps<T> {
  query: QueryStateQuery<T>;
  children: (data: T) => ReactNode;
  /** Skeleton rows while loading. */
  rows?: number;
  /** Replaces the default skeleton, e.g. a tile's own bar. */
  loading?: ReactNode;
  /** A skeleton without role=status, for a page whose one status is its toast. */
  quiet?: boolean;
  /** Replaces the default error line, e.g. a screen with its own recovery. */
  error?: ReactNode;
  /** The default error line's words; «تعذّر تحميل البيانات.» when unset. */
  errorText?: string;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
}
