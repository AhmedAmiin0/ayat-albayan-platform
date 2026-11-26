import type { ReactNode } from 'react';

export interface Read<T> {
  data: T | undefined;
  isError: boolean;
  refetch: () => unknown;
}

export interface LoadStateProps<T> {
  query: Read<T>;
  children: (data: T) => ReactNode;
}

export type ReadState<T> = { phase: 'data'; data: T } | { phase: 'error' } | { phase: 'loading' };
