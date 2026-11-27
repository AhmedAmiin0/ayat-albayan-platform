import type { Read, ReadState } from './LoadState.types';

/** Cached data wins over a failed refetch (offline keeps the screen, R-MOB-03). */
export function readState<T>(query: Read<T>): ReadState<T> {
  if (query.data !== undefined) return { phase: 'data', data: query.data };
  return query.isError ? { phase: 'error' } : { phase: 'loading' };
}
