import type { HttpFailure } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';

// The ranged GET behind StorageService.head (docs/36 h2): the signed URL is the base, so its
// token never shows in a message.

/** New in h2 (none before): a sniff waits at most this long for Storage. */
export const STORAGE_HEAD_TIMEOUT_MS = 10_000;

/** Any non-2xx: the object is not there for us (null, as before). */
class NotThere extends Error {}

const failed = (f: HttpFailure): Error =>
  f.kind === 'status' ? new NotThere() : new Error(`storage head: ${f.kind}`);

/** Reads the whole answer like before (a server that ignores Range sends more), then cuts it. */
const UNCAPPED = Number.MAX_SAFE_INTEGER;

/** The first `bytes` bytes behind a signed URL; null on any non-2xx; a network error throws. */
export async function headBytes(signedUrl: string, bytes: number): Promise<Uint8Array | null> {
  const http = createHttp({
    name: 'storage',
    base: () => signedUrl,
    headers: () => Promise.resolve({}),
    timeoutMs: STORAGE_HEAD_TIMEOUT_MS,
    redirect: 'follow',
    errorBody: 'omit',
    errors: { default: failed },
  });
  const range = { Range: `bytes=0-${bytes - 1}` };
  const tooLarge = (): Error => new NotThere();
  try {
    const got = await http.bytes({ path: '', headers: range, maxBytes: UNCAPPED, tooLarge });
    return got.bytes.slice(0, bytes);
  } catch (e) {
    if (e instanceof NotThere) return null;
    throw e;
  }
}
