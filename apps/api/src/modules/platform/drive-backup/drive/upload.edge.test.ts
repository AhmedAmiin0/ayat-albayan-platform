import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import type { ChunkInput, ChunkResult, DriveBackupApi } from './drive-backup.port';
import { uploadStream } from './upload';

// Verification items 6b, 7 and 8: the last attempt still asks Drive, a session that never moves
// stops, the deadline stops the loop, and a failed progress() never resends confirmed bytes.

async function* pieces(sizes: number[]) {
  for (const [i, n] of sizes.entries()) yield Buffer.alloc(n, i);
}
const target = { name: 'x.tar.zst', parentId: 'folder', appProperties: {} };
const noWait = () => Promise.resolve();
const busy = () => new GoogleApiError(503, 'backendError');

/** A Drive whose chunk and progress answers are scripted; the offsets sent are recorded. */
function scripted(put: (c: ChunkInput) => ChunkResult, progress: () => Promise<ChunkResult>) {
  const sent: number[] = [];
  const api = {
    startUpload: () => Promise.resolve('session'),
    putChunk: (c: ChunkInput) => {
      sent.push(c.offset);
      return Promise.resolve().then(() => put(c));
    },
    progress,
  } as unknown as DriveBackupApi;
  return { api, sent };
}

const upload = (api: DriveBackupApi, extra: { signal?: AbortSignal } = {}) =>
  uploadStream({ api, target, source: pieces([8]), chunkBytes: 8, wait: noWait, ...extra });

describe('uploadStream edges', () => {
  it('the final chunk landed but every answer failed: Drive is asked once more, the file kept', async () => {
    let asks = 0;
    const progress = () =>
      ++asks < 5 ? Promise.reject(busy()) : Promise.resolve({ committed: 0, fileId: 'f1' });
    const { api, sent } = scripted(() => {
      throw busy();
    }, progress);
    expect(await upload(api)).toEqual({ fileId: 'f1', bytes: 8 });
    expect(sent).toHaveLength(5);
  });

  it('the last attempt fails and Drive holds nothing: the original error is thrown', async () => {
    const { api } = scripted(
      () => {
        throw busy();
      },
      () => Promise.resolve({ committed: 0, fileId: null }),
    );
    await expect(upload(api)).rejects.toThrow('backendError');
  });

  it('a 308 that never moves forward stops after 5 answers (no endless loop)', async () => {
    const { api, sent } = scripted(
      () => ({ committed: 0, fileId: null }),
      () => Promise.resolve({ committed: 0, fileId: null }),
    );
    await expect(upload(api)).rejects.toThrow('drive_upload_stalled');
    expect(sent).toHaveLength(5);
  });

  it('progress() fails: resend from the last confirmed offset, never before it', async () => {
    let n = 0;
    const put = (c: ChunkInput): ChunkResult => {
      n += 1;
      if (n === 1) return { committed: 4, fileId: null }; // Drive holds half the chunk
      if (n === 2) throw busy();
      return { committed: 0, fileId: `f@${c.offset}` };
    };
    const { api, sent } = scripted(put, () => Promise.reject(busy()));
    expect(await upload(api)).toEqual({ fileId: 'f@4', bytes: 8 });
    expect(sent).toEqual([0, 4, 4]);
  });

  it('the deadline: an aborted signal stops before any chunk is sent', async () => {
    const stop = new AbortController();
    stop.abort(new Error('run_deadline'));
    const { api, sent } = scripted(
      () => ({ committed: 0, fileId: 'f' }),
      () => Promise.resolve({ committed: 0, fileId: null }),
    );
    await expect(upload(api, { signal: stop.signal })).rejects.toThrow('run_deadline');
    expect(sent).toEqual([]);
  });
});
