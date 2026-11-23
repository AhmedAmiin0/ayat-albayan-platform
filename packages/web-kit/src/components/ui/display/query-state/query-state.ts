import type { QueryStateKind, QueryStateLoadable } from './QueryState.types';

const hasData = (q: QueryStateLoadable): boolean => q.data !== undefined;

/**
 * docs/48 load-state order: cached data wins, so a failed background refetch never blanks a
 * good screen; then the error, then loading.
 */
export function queryStateOf<T>(
  q: { data: T | undefined; isError: boolean },
  isEmpty: (data: T) => boolean = () => false,
): QueryStateKind {
  const order: readonly [QueryStateKind, () => boolean][] = [
    ['empty', () => q.data !== undefined && isEmpty(q.data)],
    ['data', () => hasData(q)],
    ['error', () => q.isError],
  ];
  return order.find(([, holds]) => holds())?.[0] ?? 'loading';
}
