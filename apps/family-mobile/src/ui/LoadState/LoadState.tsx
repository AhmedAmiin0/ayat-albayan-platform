import type { ReactNode } from 'react';
import { ErrorState, SkeletonCard } from '@ab/mobile-kit';
import type { LoadStateProps, Phase } from './LoadState.types';
import { phaseOf } from './load-state.helpers';

/** A read's three faces: a skeleton, the retry, or its content. */
export function LoadState<T>({ query, children }: LoadStateProps<T>) {
  const PHASE: Record<Phase, () => ReactNode> = {
    loading: () => <SkeletonCard />,
    error: () => <ErrorState onRetry={() => void query.refetch()} />,
    data: () => (query.data === undefined ? null : children(query.data)),
  };
  return PHASE[phaseOf(query)]();
}
