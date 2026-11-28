import { ApiError } from '@ab/mobile-kit';
import { z } from 'zod';

const refusal = z.object({ code: z.string() });

/** The API's refusal `{ code }` of a failed call; undefined for any other error or body. */
export function errorCode(error: unknown): string | undefined {
  return refusal.safeParse(error instanceof ApiError ? error.body : null).data?.code;
}
