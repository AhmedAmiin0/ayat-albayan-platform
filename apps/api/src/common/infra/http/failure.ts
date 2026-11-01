import { z } from 'zod';

// What went wrong with one outbound call, as data (docs/36 §4). A failure never carries the URL,
// a header value or the request body: `where` is the profile name, the method and the path only.

/** The transport seam: the global fetch, or a test double (LiveKit's LIVEKIT_HTTP, the fakes). */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

type FailureKind =
  /** reached: the peer may have the request (always true once the response headers arrived). */
  | { kind: 'network'; reached: boolean }
  /** The deadline fired (signal + race): the peer may have the request. */
  | { kind: 'timeout' }
  /** A non-2xx. text: the body capped at 300 chars, '' when the profile omits error bodies. */
  | { kind: 'status'; status: number; body: unknown; text: string; retryAfter: string | null }
  /** A 2xx whose body does not match the call's schema. */
  | { kind: 'shape'; status: number; issues: z.core.$ZodIssue[] };

/** `where`: «profile METHOD /path», never the host, the query, a header or the body. */
export type HttpFailure = FailureKind & { where: string };

/** Connection errors raised before any byte left: the request never reached the peer (graph.ts). */
const NEVER_SENT = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
]);

/** undici puts the errno on the TypeError's `cause` (`fetch failed` → { code: 'ECONNREFUSED' }). */
const errnoSchema = z.object({ cause: z.object({ code: z.union([z.string(), z.number()]) }) });

/**
 * Could this transport error have happened after the peer got the request? A timeout or a dropped
 * connection can; a refused or unresolvable connection cannot. Unknown errors count as reached:
 * never resend blindly (today's `mayHaveReachedMeta`).
 */
export function mayHaveReached(error: unknown): boolean {
  const errno = error instanceof Error ? errnoSchema.safeParse(error) : null;
  return !NEVER_SENT.has(errno?.success ? String(errno.data.cause.code) : '');
}

/** Thrown inside the core only: a failure already classified (status, shape), for the table. */
export class Failed extends Error {
  constructor(readonly failure: HttpFailure) {
    super(failure.where);
  }
}

/** Thrown inside the core only: the caller's own error (BytesCall.tooLarge), rethrown as is. */
export class Passthrough extends Error {
  constructor(readonly error: Error) {
    super(error.message);
  }
}
