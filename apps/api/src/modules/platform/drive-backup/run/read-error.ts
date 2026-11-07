import { errorText } from '@/modules/platform/google-sync';
import type { SkipWhy } from './summary';

/** A failure reading an object from MinIO (not Drive, not the DB): the admin looks at MinIO. */
export class SourceReadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SourceReadError';
  }
}

/** The body's chunks; any failure while reading them (a cut socket, S3) is a SourceReadError. */
export async function* fromSource(body: AsyncIterable<Uint8Array>): AsyncGenerator<Uint8Array> {
  try {
    for await (const c of body) yield c;
  } catch (e) {
    throw new SourceReadError(errorText(e), { cause: e });
  }
}

/** Why one big object's own part failed: reading it from MinIO, or anything else (Drive, DB). */
export const soloWhy = (e: unknown): SkipWhy =>
  e instanceof SourceReadError ? 'read_failed' : 'upload_failed';
