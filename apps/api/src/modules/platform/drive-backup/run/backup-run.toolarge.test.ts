import { describe, expect, it } from 'vitest';
import { B, names, roomOf, setup } from './backup-run.fakes';

// docs/45 §5.1, verification item 1: one object larger than the night's room never blocks the
// objects after it, and never seals a full that lacks it.

const MB = 1024 ** 2;

describe('an object larger than tonight’s room', () => {
  it('is skipped and named; later objects still go; the full stays open', async () => {
    const t = await setup();
    let room = 3 * MB;
    roomOf(t.drive, () => room);
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    t.minio.set({ bucket: B.reports, key: 'big.pdf', body: Buffer.alloc(4 * MB, 7) });
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c' });
    const first = await t.night('2026-11-07');
    expect(first).toMatchObject({ objects: 2, tooLarge: ['reports/big.pdf'], sealed: false });
    const again = await t.night('2026-11-08');
    expect(again).toMatchObject({ kind: 'full', label: '2026-W45', objects: 0, sealed: false });
    expect(again.tooLarge).toEqual(['reports/big.pdf']);
    room = 50 * MB;
    const done = await t.night('2026-11-09');
    expect(done).toMatchObject({ kind: 'full', objects: 1, tooLarge: [], sealed: true });
    expect(names(t.drive, t.folderId)).toEqual([
      'full-2026-W45.tar.zst',
      'full-2026-W45.p2.tar.zst',
    ]);
  });

  it('no room for any part at all: the run stops (drive_full), nothing is sent', async () => {
    const t = await setup();
    roomOf(t.drive, () => MB / 2);
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    await expect(t.night('2026-11-07')).rejects.toThrow('drive_full');
    expect(t.drive.log).not.toContain('startUpload');
  });

  it('a part that no longer fits waits while a later one fits; none fits: drive_full', async () => {
    const t = await setup({ part: 3 * MB, run: 1024 ** 3 });
    let calls = 0;
    roomOf(t.drive, () => (calls++ === 1 ? 2 * MB : 20 * MB)); // shrinks before the first part
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: Buffer.alloc(2 * MB, 1) });
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: 'b' });
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ objects: 1, left: 1, sealed: false });
  });
});
