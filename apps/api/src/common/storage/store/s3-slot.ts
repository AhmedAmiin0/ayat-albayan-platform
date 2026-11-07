import { PutObjectCommand } from '@aws-sdk/client-s3';
import { withinBucketRule } from './bucket-rules';
import type { SlotKey } from './object-store';

/**
 * A signed upload slot lives 15 minutes and carries If-None-Match: * (signed): one upload per key,
 * so a file the API already checked can never be replaced through the same URL (docs/45).
 */
export const UPLOAD_SECONDS = 15 * 60;

/** Signed with the request, never hoisted to the query: MinIO checks the PUT carries these. */
export const SLOT_SIGNED_HEADERS = new Set(['content-type', 'content-length']);

/** A slot the bucket would never take (Supabase's own cap and type list, bucket-rules.ts). */
class SlotRefused extends Error {
  constructor() {
    super('storage slot refused: size or type outside the bucket rule');
  }
}

/**
 * The PUT a MinIO slot admits: exactly the declared size and type (Content-Length and Content-Type
 * are signed), once (If-None-Match: *). MinIO has no bucket limits, so this is the disk's wall.
 */
export function slotCommand(o: SlotKey, bucket: string): PutObjectCommand {
  if (!withinBucketRule(o.bucket, { size: o.file.size, contentType: o.file.mime })) {
    throw new SlotRefused();
  }
  return new PutObjectCommand({
    Bucket: bucket,
    Key: o.key,
    IfNoneMatch: '*',
    ContentLength: o.file.size,
    ContentType: o.file.mime,
  });
}
