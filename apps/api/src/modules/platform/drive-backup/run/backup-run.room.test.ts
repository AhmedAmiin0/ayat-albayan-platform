import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { B, fit, names, roomOf, setup } from './backup-run.fakes';

// docs/45 §5: the night's budget is Drive's free space minus the 2 GB reserve, read again before
// each part; nothing is uploaded past it, and the rest simply waits for a later night.

const MB = 1024 ** 2;

describe('the 2 GB reserve', () => {
  it('re-reads the quota before each part; a part past the budget waits', async () => {
    const t = await setup({ part: fit(2) });
    for (const k of ['a', 'b', 'c'])
      t.minio.set({ bucket: B.reports, key: k, body: 'x'.repeat(10) });
    let room = 10 * MB;
    roomOf(t.drive, () => room);
    const put = t.drive.putChunk.bind(t.drive);
    t.drive.putChunk = async (input) => {
      const r = await put(input);
      room = 0; // the first part used the last of the room
      return r;
    };
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ parts: 1, objects: 2, waiting: 1 });
    expect(t.drive.log.filter((m) => m === 'quota')).toHaveLength(3); // tonight, then each part
    room = 10 * MB;
    expect(await t.night('2026-11-08')).toMatchObject({ objects: 1, waiting: 0 });
  });

  it('too little room: the night uploads nothing, every object waits', async () => {
    const t = await setup();
    roomOf(t.drive, () => MB / 2);
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    expect(await t.night('2026-11-07')).toMatchObject({ parts: 0, waiting: 1 });
    expect(t.drive.log).not.toContain('startUpload');
  });

  it('a large part waits while a smaller later one still fits', async () => {
    const t = await setup({ part: 8 * MB });
    roomOf(t.drive, () => 2 * MB);
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: Buffer.alloc(2 * MB, 1) });
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: Buffer.alloc(2 * MB, 2) });
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c' });
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ objects: 1, waiting: 2 });
  });

  it('storageQuotaExceeded stops the night (never «skip it»)', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'big.mp4', body: Buffer.alloc(65 * MB) });
    t.minio.set({ bucket: B.reports, key: 'z.pdf', body: 'z' });
    t.drive.failNext.set('putChunk', new GoogleApiError(403, 'storageQuotaExceeded'));
    await expect(t.night('2026-11-07')).rejects.toThrow('storageQuotaExceeded');
    expect(t.store.rows.map((r) => r.status)).toEqual(['failed']);
  });
});

describe('an object larger than the part cap', () => {
  it('is skipped and named every night; the others still go', async () => {
    const t = await setup({ part: 3 * MB });
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    t.minio.set({ bucket: B.reports, key: 'big.pdf', body: Buffer.alloc(4 * MB, 7) });
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c' });
    const named = [{ id: 'reports/big.pdf', size: 4 * MB, reason: 'too_large' }];
    expect(await t.night('2026-11-07')).toMatchObject({ objects: 2, skipped: named });
    expect(await t.night('2026-11-08')).toMatchObject({ objects: 0, skipped: named });
    expect(names(t.drive, t.folderId)).toEqual(['add-2026-11-07.p1.tar.zst']);
  });
});
