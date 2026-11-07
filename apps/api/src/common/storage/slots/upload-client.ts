import { AsyncLocalStorage } from 'node:async_hooks';
import { UPLOAD_SLOT_V2 } from '@ab/shared';
import { z } from 'zod';

// Which slot the calling client can fill (docs/45 §4 step 9): the request's X-AB-Upload header,
// kept for the request's own async work so StorageService.signedUpload reads it without every
// upload route passing it down. Outside a request (jobs, scripts): no capability.

const requests = new AsyncLocalStorage<boolean>();

/** The header's value (one string, or none: Fastify gives an array for a repeated header). */
const slotV2 = z.literal(UPLOAD_SLOT_V2);

/** Runs `work` as a request whose client sent this X-AB-Upload value. */
export function withUploadClient<T>(header: unknown, work: () => T): T {
  return requests.run(slotV2.safeParse(header).success, work);
}

/** Can the current request's client upload to a MinIO slot (a PUT to its signed URL)? */
export const canFillMinioSlot = (): boolean => requests.getStore() === true;
