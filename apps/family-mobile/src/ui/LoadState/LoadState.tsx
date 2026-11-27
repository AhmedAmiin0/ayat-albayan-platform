import { ErrorState, SkeletonCard } from '@ab/mobile-kit';
import type { LoadStateProps } from './LoadState.types';
import { readState } from './load-state.helpers';

/** A read's three faces: a skeleton, the retry, or its content. */
export function LoadState<T>({ query, children }: LoadStateProps<T>) {
  const read = readState(query);
  if (read.phase === 'loading') return <SkeletonCard />;
  if (read.phase === 'error') return <ErrorState onRetry={() => void query.refetch()} />;
  return children(read.data);
}
