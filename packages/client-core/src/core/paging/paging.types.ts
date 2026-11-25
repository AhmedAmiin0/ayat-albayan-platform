import type { Page } from '@ab/core';
import type { z } from 'zod';

export interface WithId {
  id: string;
}

/** A list endpoint: its path and the schema of one `Page<T>` answer. */
export interface ListEndpoint<S extends z.ZodType<Page<unknown>>> {
  path: string;
  page: S;
}

export interface PageOptions<S extends z.ZodType> {
  queryKey: unknown[];
  queryFn: () => Promise<z.output<S>>;
}

/** TanStack's infinite query options, without a TanStack dependency (client-core has none). */
export interface InfinitePageOptions<S extends z.ZodType<Page<unknown>>> {
  queryKey: unknown[];
  initialPageParam: number;
  queryFn: (context: { pageParam: number }) => Promise<z.output<S>>;
  getNextPageParam: (last: Page<unknown>) => number | undefined;
}
