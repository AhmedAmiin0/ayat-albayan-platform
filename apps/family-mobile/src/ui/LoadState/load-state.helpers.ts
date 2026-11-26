import type { Read, Phase } from './LoadState.types';

/** Cached data wins over a failed refetch (offline keeps the screen, R-MOB-03). */
export function phaseOf<T>(query: Read<T>): Phase {
  if (query.data !== undefined) return 'data';
  return query.isError ? 'error' : 'loading';
}
