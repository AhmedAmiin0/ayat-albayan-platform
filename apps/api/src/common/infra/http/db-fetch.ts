import { DbTimeoutError } from '@/common/db/db-timeout';

/** Database work: PostgREST (tables, RPCs) and Auth. Storage moves files: no deadline. */
const TIMED_PATHS = ['/rest/v1/', '/auth/v1/'];

const urlOf = (input: string | URL | Request): string =>
  input instanceof Request ? input.url : String(input);

const timed = (input: string | URL | Request): boolean => {
  const path = new URL(urlOf(input)).pathname;
  return TIMED_PATHS.some((p) => path.startsWith(p));
};

/** The fetch signature (supabase-js's `global.fetch`). */
export type FetchLike = typeof fetch;

interface TimedFetchOptions {
  ms: number;
  /** The real fetch (tests pass a slow or fast fake). */
  base?: FetchLike;
}

/** supabase-js's global fetch: a database call past `ms` fails with DbTimeoutError, never hangs. */
export function timedFetch({ ms, base = fetch }: TimedFetchOptions): FetchLike {
  return (input, init) => {
    if (!timed(input)) return base(input, init);
    const deadline = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
    return base(input, { ...init, signal }).catch((e: unknown) => {
      throw deadline.aborted ? new DbTimeoutError(ms) : e;
    });
  };
}
