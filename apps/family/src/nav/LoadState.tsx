import type { ReactNode } from 'react';
import { ErrorState, SkeletonCard } from '@ab/mobile-kit';

interface Read<T> {
  data: T | undefined;
  isError: boolean;
  refetch: () => unknown;
}

interface LoadStateProps<T> {
  query: Read<T>;
  children: (data: T) => ReactNode;
}

type Phase = 'data' | 'error' | 'loading';

/** Cached data wins over a failed refetch (offline keeps the screen, R-MOB-03). */
function phaseOf<T>(query: Read<T>): Phase {
  if (query.data !== undefined) return 'data';
  return query.isError ? 'error' : 'loading';
}

/** A read's three faces: a skeleton, the retry, or its content. */
export function LoadState<T>({ query, children }: LoadStateProps<T>) {
  const PHASE: Record<Phase, () => ReactNode> = {
    loading: () => <SkeletonCard />,
    error: () => <ErrorState onRetry={() => void query.refetch()} />,
    data: () => (query.data === undefined ? null : children(query.data)),
  };
  return PHASE[phaseOf(query)]();
}
