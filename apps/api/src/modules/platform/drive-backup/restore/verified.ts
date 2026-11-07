import { createHash } from 'node:crypto';

/** A single-part S3 ETag: the object's MD5 (a multipart one carries «-N» and is no digest). */
const MD5_ETAG = /^[0-9a-f]{32}$/;

class EtagMismatch extends Error {
  constructor() {
    super('etag_mismatch');
  }
}

async function* checkedMd5(body: AsyncIterable<Buffer>, etag: string): AsyncGenerator<Buffer> {
  const hash = createHash('md5');
  let held: Buffer | null = null;
  for await (const c of body) {
    if (held) yield held;
    hash.update(c);
    held = c;
  }
  if (hash.digest('hex') !== etag) throw new EtagMismatch();
  if (held) yield held;
}

/**
 * An entry's bytes, checked against the MD5 ETag the backup recorded: the last chunk is held back
 * until the digest matches, so MinIO (which stores an object only once its whole Content-Length
 * arrived) never keeps bad bytes; a mismatch fails that key. Multipart ETags pass unchecked (the
 * archive's zstd checksum, awaited at its end, still fails the restore).
 */
export function verified(body: AsyncIterable<Buffer>, etag: string): AsyncIterable<Buffer> {
  return MD5_ETAG.test(etag) ? checkedMd5(body, etag) : body;
}
