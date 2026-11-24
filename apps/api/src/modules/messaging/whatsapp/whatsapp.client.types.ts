import type { FetchLike } from './drivers/meta/graph';

export interface ClientOpts {
  fetch?: FetchLike;
  timeoutMs?: number;
  allowed?: readonly string[] | null;
}
