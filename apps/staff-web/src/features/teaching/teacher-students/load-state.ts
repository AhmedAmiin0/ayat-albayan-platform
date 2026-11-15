/** docs/48 load-state order: data first, else an error (nothing cached), else loading. */
export type LoadState = 'ready' | 'error' | 'loading';

interface Loadable {
  data: unknown;
  isError: boolean;
}

const hasData = (q: Loadable): boolean => q.data !== undefined;

/** The first state that holds; a failed background refetch with data stays 'ready'. */
export function loadState(q: Loadable): LoadState {
  const order: readonly [LoadState, boolean][] = [
    ['ready', hasData(q)],
    ['error', q.isError],
  ];
  return order.find(([, holds]) => holds)?.[0] ?? 'loading';
}
