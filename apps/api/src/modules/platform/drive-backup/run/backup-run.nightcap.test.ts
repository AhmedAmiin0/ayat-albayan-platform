import { describe, expect, it } from 'vitest';
import { B, names, setup } from './backup-run.fakes';

// Round 4, item 1: an object above the night's cap is too large: never opened nor uploaded, named
// every night, and it never blocks the other objects nor the sealing of a full.

const MB = 1024 ** 2;
const NIGHTS = ['2026-11-07', '2026-11-08', '2026-11-09'];

describe('an object above the night cap that would fail every night', () => {
  it('3 nights: the others go every night, the full seals, it is only reported', async () => {
    const t = await setup({ part: 3 * MB, run: 3 * MB });
    t.minio.set({ bucket: B.recordings, key: 'big.mp4', body: Buffer.alloc(4 * MB, 7) });
    t.minio.unreadable.add('recordings/big.mp4'); // would fail on every read
    const opened: string[] = [];
    const open = t.minio.open.bind(t.minio);
    t.minio.open = (o) => {
      opened.push(`${o.bucket}/${o.key}`);
      return open(o);
    };
    t.deps.buckets.push(B.recordings);
    const sums = [];
    for (const [i, night] of NIGHTS.entries()) {
      t.minio.set({ bucket: B.reports, key: `r${i}.pdf`, body: `report ${i}` });
      sums.push(await t.night(night));
    }
    const big = { id: 'recordings/big.mp4', size: 4 * MB, why: 'night' };
    for (const sum of sums) expect(sum).toMatchObject({ objects: 1, skipped: 0, tooLarge: [big] });
    expect(sums.map((s) => s.kind)).toEqual(['full', 'incr', 'incr']);
    expect(sums[0]?.sealed).toBe(true);
    expect(opened).not.toContain('recordings/big.mp4');
    expect(names(t.drive, t.folderId)).toEqual([
      'full-2026-W45.tar.zst',
      'incr-2026-11-08.tar.zst',
      'incr-2026-11-09.tar.zst',
    ]);
  });
});
