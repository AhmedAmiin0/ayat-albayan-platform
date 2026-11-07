import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { FakeDrive } from './drive-backup.fakes';
import { uploadStream } from './upload';

// A chunk that landed on Drive but whose answer was lost (a timeout after the bytes arrived).

async function* pieces(sizes: number[]) {
  for (const [i, n] of sizes.entries()) yield Buffer.alloc(n, i);
}
const target = { name: 'x.tar.zst', parentId: 'folder', appProperties: {} };
const noWait = () => Promise.resolve();

/** putChunk commits the `nth` chunk, then fails as if the answer never came back. */
function landsThenFails(drive: FakeDrive, nth: number) {
  const put = drive.putChunk.bind(drive);
  const sent: string[] = [];
  drive.putChunk = async (input) => {
    sent.push(`${input.offset}+${input.bytes.length}`);
    const r = await put(input);
    if (sent.length === nth) throw new GoogleApiError(0, 'timeout');
    return r;
  };
  return sent;
}

describe('uploadStream resume when Drive already holds the chunk', () => {
  it('a non-final chunk held whole: no resend, no inverted range, the next chunk follows', async () => {
    const drive = new FakeDrive();
    const sent = landsThenFails(drive, 1);
    const up = await uploadStream({
      api: drive,
      target,
      source: pieces([8, 8, 4]),
      chunkBytes: 8,
      wait: noWait,
    });
    expect(sent).toEqual(['0+8', '8+8', '16+4']);
    expect(drive.files.get(up.fileId)?.bytes.length).toBe(20);
  });

  it('the final chunk landed: progress() answers the file, returned as is', async () => {
    const drive = new FakeDrive();
    const sent = landsThenFails(drive, 2);
    const up = await uploadStream({
      api: drive,
      target,
      source: pieces([8, 4]),
      chunkBytes: 8,
      wait: noWait,
    });
    expect(sent).toEqual(['0+8', '8+4']);
    expect(drive.files.size).toBe(1);
    expect(drive.files.get(up.fileId)?.bytes.length).toBe(12);
  });
});
