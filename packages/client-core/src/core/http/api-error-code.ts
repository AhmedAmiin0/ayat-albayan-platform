import { z } from 'zod';
import { ApiError } from './api-error.js';

const coded = z.object({ code: z.string() });

/** The `code` of an API error's body («pdf_busy», «media_expired»…); null for anything else. */
export function apiErrorCode(e: unknown): string | null {
  const parsed = e instanceof ApiError ? coded.safeParse(e.body) : null;
  return parsed?.success ? parsed.data.code : null;
}

/**
 * A chat PDF page worth asking again: a 503 from a busy render slot or a failed render, never
 * `pdf_unavailable` (no sandbox: asking again only repeats the same answer).
 */
export function pdfPageRetryable(e: unknown): boolean {
  return e instanceof ApiError && e.status === 503 && apiErrorCode(e) !== 'pdf_unavailable';
}
