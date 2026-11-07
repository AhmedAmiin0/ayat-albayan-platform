import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { FakeDrive } from './drive-backup.fakes';
import { rechunk, uploadStream } from './upload';

async function* pieces(sizes: number[]) {
  for (const [i, n] of sizes.entries()) yield Buffer.alloc(n, i);
}
const target = { name: 'x.tar.zst', parentId: 'folder', appProperties: {} };
const noWait = () => Promise.resolve();

describe('rechunk', () => {
  it('exact-size chunks, the last one shorter', async () => {
    const out: number[] = [];
    for await (const c of rechunk(pieces([5, 7, 1, 20]), 8)) out.push(c.length);
    expect(out).toEqual([8, 8, 8, 8, 1]);
  });
});

describe('uploadStream (resumable)', () => {
  it('sends fixed chunks, the total on the last one, and returns the file', async () => {
    const drive = new FakeDrive();
    const up = await uploadStream({
      api: drive,
      target,
      source: pieces([10, 10, 5]),
      chunkBytes: 8,
      wait: noWait,
    });
    expect(up.bytes).toBe(25);
    expect(drive.files.get(up.fileId)?.bytes.length).toBe(25);
    expect(drive.log.filter((m) => m === 'putChunk')).toHaveLength(4);
  });

  it('a 503 waits, asks Drive what it holds, and resends from there', async () => {
    const drive = new FakeDrive();
    drive.failNext.set('putChunk', new GoogleApiError(503, 'backendError'));
    const waits: number[] = [];
    const wait = (ms: number) => Promise.resolve(void waits.push(ms));
    const up = await uploadStream({
      api: drive,
      target,
      source: pieces([20]),
      chunkBytes: 8,
      wait,
    });
    expect(waits).toEqual([2000]);
    expect(drive.log).toContain('progress');
    expect(drive.files.get(up.fileId)?.bytes).toEqual(Buffer.alloc(20, 0));
  });

  it('a non-retryable error fails the upload at once', async () => {
    const drive = new FakeDrive();
    drive.failNext.set('putChunk', new GoogleApiError(403, 'storageQuotaExceeded'));
    await expect(
      uploadStream({ api: drive, target, source: pieces([4]), wait: noWait }),
    ).rejects.toThrow('403');
  });

  it('gives up after 5 attempts', async () => {
    const drive = new FakeDrive();
    drive.putChunk = () => Promise.reject(new GoogleApiError(500, 'backendError'));
    await expect(
      uploadStream({ api: drive, target, source: pieces([4]), wait: noWait }),
    ).rejects.toThrow('500');
  });
});
