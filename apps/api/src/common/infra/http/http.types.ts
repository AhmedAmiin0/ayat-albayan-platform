import type { z } from 'zod';
import type { ErrorTable } from './errors';
import type { FetchLike } from './failure';

// The one outbound client's shapes (docs/36 §4): a profile per integration, a request per call.

export interface HttpProfile<E extends Error> {
  /** The only service name in messages and logs. */
  name: string;
  base: () => string;
  /** {} for a no-credential profile. Read before the deadline starts; its errors pass unchanged. */
  headers: () => Promise<Record<string, string>>;
  timeoutMs: number;
  /** Required, today's value per integration: 'manual', 'follow' or 'error'. */
  redirect: NonNullable<RequestInit['redirect']>;
  /** The error body's schema, or 'omit': never keep the body (it may hold a family's number). */
  errorBody: z.ZodType | 'omit';
  errors: ErrorTable<E>;
  /** Test seam (LiveKit's LIVEKIT_HTTP); the global fetch otherwise. */
  fetch?: FetchLike;
}

export interface HttpRequest {
  /** Relative to base(), or an absolute URL. */
  path: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  json?: unknown;
  raw?: Uint8Array<ArrayBuffer>;
  /** Override or add headers (the upload's `authorization: OAuth …`, `file_offset`). */
  headers?: Record<string, string>;
  /** Overrides the profile's timeout for this call (the media bytes). */
  timeoutMs?: number;
  /** The caller's own abort: combined with the deadline; its reason is rethrown unchanged. */
  signal?: AbortSignal;
}

export type JsonCall<S extends z.ZodType> = HttpRequest & { schema: S };
/** tooLarge: the caller's own error when the body passes maxBytes (e.g. 413 invoice_too_large). */
export type BytesCall = HttpRequest & { maxBytes: number; tooLarge: () => Error };

export interface Http {
  /** The body parsed by `schema`; throws the profile table's error otherwise. */
  json<S extends z.ZodType>(call: JsonCall<S>): Promise<z.output<S>>;
  bytes(call: BytesCall): Promise<{ bytes: Uint8Array; mime: string | null }>;
  /** Any status, body discarded; never consults the table for a status (network/timeout only). */
  status(call: HttpRequest): Promise<number>;
}
