import type { FetchLike } from './meta/graph';

export interface ClientOpts {
  fetch?: FetchLike;
  timeoutMs?: number;
  allowed?: readonly string[] | null;
}
