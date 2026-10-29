import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Runs `fn` in a new folder under the OS temp dir and always removes the folder afterwards, on success or
 * failure: the files a tool reads and writes (voice-ogg's ffmpeg, pdf-render's poppler) never pile up.
 */
export async function inTempDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
