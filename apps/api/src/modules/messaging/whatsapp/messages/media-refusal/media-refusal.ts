import { HttpException, HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { mediaRefusalSchema, type MediaRefusal } from './media-refusal.schemas';
import { httpError } from '@/common/http/errors';

// A file too large for the chat cap, or whose id the provider refused, is refused the same way on
// every later view with no second provider call (R-MSG-06, R-NFR-07: one oversized answer per
// file, not one per view). A timeout, a 5xx or a refused key is not final and is never kept.

const STATUS: Record<MediaRefusal, HttpStatus> = {
  invoice_too_large: HttpStatus.PAYLOAD_TOO_LARGE,
  media_expired: HttpStatus.GONE,
};

const answerSchema = z.object({ code: mediaRefusalSchema });

/** The final refusal an error stands for, or null. */
export function refusalOf(e: unknown): MediaRefusal | null {
  const answer = e instanceof HttpException ? e.getResponse() : null;
  return answerSchema.safeParse(answer).data?.code ?? null;
}

/** The file, or 413 invoice_too_large past `max` bytes. */
export function withinCap<T extends { bytes: Uint8Array }>(file: T, max: number): T {
  if (file.bytes.byteLength > max) throw httpError(STATUS.invoice_too_large, 'invoice_too_large');
  return file;
}

/** Runs `fetch`; a final refusal is stored with `keep` before the error is rethrown as is. */
export async function keepingRefusal<T>(
  fetch: () => Promise<T>,
  keep: (refusal: MediaRefusal) => Promise<void>,
): Promise<T> {
  try {
    return await fetch();
  } catch (e) {
    const refusal = refusalOf(e);
    if (refusal) await keep(refusal);
    throw e;
  }
}

/** Throws the refusal stored on a row; an empty or unknown value lets the file be fetched. */
export function rejectStored(stored: string | null | undefined): void {
  const refusal = mediaRefusalSchema.safeParse(stored);
  if (refusal.success) throw httpError(STATUS[refusal.data], refusal.data);
}
