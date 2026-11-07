import { z } from 'zod';
import { ObjectExists } from './object-store';

// What the S3 API answers (zod at the boundary, rule 12): only the fields the adapter reads.

const bodySchema = z.custom<{ transformToByteArray: () => Promise<Uint8Array> }>(
  (v) => z.object({ transformToByteArray: z.function() }).safeParse(v).success,
);

export const getOutput = z.object({ Body: bodySchema });

export const headOutput = z.object({
  ContentLength: z.number().optional(),
  ContentType: z.string().optional(),
});

export const listOutput = z.object({
  Contents: z.array(z.object({ Key: z.string().optional() })).optional(),
  IsTruncated: z.boolean().optional(),
  NextContinuationToken: z.string().optional(),
});

const errorShape = z.object({
  name: z.string().optional(),
  $metadata: z.object({ httpStatusCode: z.number().optional() }).optional(),
});

/** Missing object (404) or an empty object asked for a byte range (416): null, as with Supabase. */
const MISSING: ReadonlySet<number> = new Set([404, 416]);

const statusOf = (e: unknown): number =>
  errorShape.safeParse(e).data?.$metadata?.httpStatusCode ?? 0;

/** S3's error name only (never a URL, a key or a signature) in the message. */
const s3Failure = (what: string, e: unknown): Error =>
  new Error(`storage ${what} failed: ${errorShape.safeParse(e).data?.name ?? 'network'}`);

/** The answer, null when the object is missing; any other failure throws (error surfaced). */
export async function orMissing<T>(what: string, call: () => Promise<T>): Promise<T | null> {
  try {
    return await call();
  } catch (e) {
    if (MISSING.has(statusOf(e))) return null;
    throw s3Failure(what, e);
  }
}

/** The answer; any failure throws with S3's error name. */
export async function orFail<T>(what: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (e) {
    throw s3Failure(what, e);
  }
}

/** A conditional put (If-None-Match: *) that found the key taken: 412 → ObjectExists. */
const TAKEN = 412;

/** The answer; 412 throws ObjectExists, any other failure throws with S3's error name. */
export async function orExists<T>(what: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (e) {
    if (statusOf(e) === TAKEN) throw new ObjectExists();
    throw s3Failure(what, e);
  }
}
